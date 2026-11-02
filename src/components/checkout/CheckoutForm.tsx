'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CircleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import * as z from 'zod/mini'

import { Checkbox } from '@/components/forms/Checkbox'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/forms/Input'
import { Label } from '@/components/forms/Label'
import { LeadForm, OptionalLabel } from '@/components/forms/LeadForm'
import { Select } from '@/components/forms/Select'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Spinner } from '@/components/ui/Spinner'
import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { track } from '@/lib/analytics'
import type { CouponProblem } from '@/lib/commerce/pricing'
import {
  billingSchema,
  type Billing,
  type CreateResponse,
  type QuoteView,
  type StoreError,
} from '@/lib/commerce/schemas'
import { formatINR, numberFormat } from '@/lib/format'
import { gstinState } from '@/lib/tax/gstin'
import { GST_STATES, isStateCode, STATE_OPTIONS } from '@/lib/tax/states'
import { useHydrated } from '@/lib/useHydrated'
import { tokens } from '@/styles/tokens.generated'

import { loadRazorpay, type RazorpaySuccess } from './razorpay'

// The create endpoint takes `accept: true`; the box itself is a boolean until it is ticked.
const formSchema = z.extend(billingSchema, {
  accept: z.boolean().check(z.refine((v) => v, 'accept')),
})

type Failure = { ok?: undefined; error: StoreError; reason?: CouponProblem; field?: string }
type QuoteResult = { ok: true; quote: QuoteView } | Failure

async function post<T extends { ok: true }>(url: string, body: unknown): Promise<T | Failure> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as T | Failure | null
    if (data && (data.ok || data.error)) return data
    return {
      error: res.status === 429 ? 'rateLimited' : res.status === 401 ? 'signedOut' : 'server',
    }
  } catch {
    return { error: 'server' }
  }
}

type Problem =
  | 'cancelled'
  | 'failed'
  | 'mismatch'
  | 'unavailable'
  | 'rateLimited'
  | 'invalid'
  | 'coupon'
  | 'server'

export type CheckoutFormProps = {
  product: { slug: string; name: string }
  plan: { code: string }
  /** The account email: receipts and invoices go there. */
  email: string
  /** Prefilled from the customer's profile. */
  billing: Billing
  /** Rendered on the server for `quoteState` without a coupon. */
  quote: QuoteView
  /** The state priced while the state field is empty: the customer's, else the seller's. */
  quoteState: string
  /** Product, plan and price, rendered on the server. */
  summary: ReactNode
}

/**
 * Checkout (spec §11.3 steps 2–4): billing details, coupon, live price breakdown and the
 * acceptance box, then Razorpay Checkout. The server re-prices everything; the breakdown here is
 * the server's quote for the current state and coupon.
 */
export function CheckoutForm({
  product,
  plan,
  email,
  billing,
  quote: initialQuote,
  quoteState,
  summary,
}: CheckoutFormProps) {
  const t = useTranslations('checkout')
  const tForms = useTranslations('forms.errors')
  const locale = useLocale() as Locale
  const router = useRouter()
  const summaryId = useId()
  const billingId = useId()
  const [quote, setQuote] = useState(initialQuote)
  const [quoting, setQuoting] = useState(false)
  const [couponError, setCouponError] = useState<CouponProblem | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [paying, setPaying] = useState(false)
  const latestQuote = useRef(0)
  const quotedState = useRef(quoteState)

  const form = useForm<z.input<typeof formSchema>, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...billing, accept: false },
    mode: 'onTouched',
  })
  const { register, control, setValue, getValues } = form
  const { errors } = form.formState
  // Messages are keys into checkout.errors (checkout-only rules) or forms.errors.
  const errorText = (error?: { message?: string }) => {
    const key = error?.message
    if (!key) return undefined
    return t.has(`errors.${key}`) ? t(`errors.${key}`) : tForms(key)
  }

  const signIn = () =>
    router.push({
      pathname: '/account/sign-in',
      query: { next: `/checkout/${product.slug}/${plan.code}` },
    })

  // A valid GSTIN fixes the place of supply (spec §11.4): its state, and only that state.
  const gstin = useWatch({ control, name: 'gstin' })
  const state = useWatch({ control, name: 'state' })
  const lockedState = gstinState(gstin)
  useEffect(() => {
    if (lockedState) setValue('state', lockedState, { shouldValidate: true, shouldDirty: true })
  }, [lockedState, setValue])
  const stateOptions = lockedState
    ? [{ code: lockedState, name: GST_STATES[lockedState] }]
    : STATE_OPTIONS

  /** Prices the order for the current state with `coupon`; null when a newer quote replaced it. */
  const requote = async (coupon: string): Promise<QuoteResult | null> => {
    const values = getValues()
    const buyerState = isStateCode(values.state) ? values.state : quoteState
    quotedState.current = buyerState
    const id = ++latestQuote.current
    setQuoting(true)
    const res = await post<{ ok: true; quote: QuoteView }>('/api/v1/checkout/quote', {
      product: product.slug,
      plan: plan.code,
      coupon,
      state: buyerState,
      gstin: gstinState(values.gstin) ? values.gstin : '',
    })
    if (id !== latestQuote.current) return null
    setQuoting(false)
    if (res.ok) setQuote(res.quote)
    else if (res.error === 'signedOut') signIn()
    else if (res.error !== 'coupon') setProblem(res.error === 'rateLimited' ? res.error : 'server')
    return res
  }

  /** Re-prices without the coupon after the server refused it. */
  const dropCoupon = async (reason: CouponProblem | undefined) => {
    setCouponError(reason ?? 'invalid')
    await requote('')
  }

  // CGST + SGST or IGST depends on the state: re-price shortly after it changes.
  const onStateChange = useEffectEvent(async () => {
    const res = await requote(quote.coupon ?? '')
    if (res && !res.ok && res.error === 'coupon') await dropCoupon(res.reason)
  })
  const buyerState = isStateCode(state) ? state : quoteState
  useEffect(() => {
    if (buyerState === quotedState.current) return
    const timer = setTimeout(() => void onStateChange(), 400)
    return () => clearTimeout(timer)
  }, [buyerState])

  const applyCoupon = async (code: string) => {
    setCouponError(null)
    const res = await requote(code)
    // A refused code leaves the current price (and any coupon already applied) as it was.
    if (res && !res.ok && res.error === 'coupon') setCouponError(res.reason ?? 'invalid')
  }

  const fail = (res: Failure) => {
    setPaying(false)
    switch (res.error) {
      case 'signedOut':
        return signIn()
      case 'coupon':
        setProblem('coupon')
        return void dropCoupon(res.reason)
      case 'invalid': {
        const field = res.field?.replace(/^billing\./, '')
        if (field && Object.hasOwn(billing, field)) {
          form.setError(field as keyof Billing, { message: 'invalid' }, { shouldFocus: true })
        }
        return setProblem('invalid')
      }
      case 'unavailable':
      case 'rateLimited':
      case 'mismatch':
        return setProblem(res.error)
      default:
        return setProblem('server')
    }
  }

  const verify = async (response: RazorpaySuccess, order: string) => {
    // A retry inside Razorpay's window can succeed after payment.failed re-enabled the form.
    setPaying(true)
    setProblem(null)
    const res = await post<{ ok: true }>('/api/v1/checkout/verify', response)
    if (!res.ok && res.error === 'mismatch') return fail(res)
    // Paid or still pending: the success page polls until the order is fulfilled.
    router.push({ pathname: '/checkout/success', query: { order } })
  }

  const pay = async (values: z.output<typeof formSchema>) => {
    if (paying) return
    setProblem(null)
    setPaying(true)
    track('checkout_start', { product: product.slug, plan: plan.code })
    const res = await post<CreateResponse>('/api/v1/checkout/create', {
      product: product.slug,
      plan: plan.code,
      coupon: quote.coupon ?? '',
      billing: {
        name: values.name,
        phone: values.phone,
        state: values.state,
        businessName: values.businessName,
        gstin: values.gstin,
      },
      accept: true,
      locale,
    })
    if (!res.ok) return fail(res)
    const { razorpay: options, order } = res
    try {
      await loadRazorpay(options.script)
    } catch {
      return fail({ error: 'server' })
    }
    if (!window.Razorpay) return fail({ error: 'server' })
    const checkout = new window.Razorpay({
      key: options.key,
      order_id: options.order_id,
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      prefill: options.prefill,
      notes: options.notes,
      theme: { color: tokens.light.primary },
      handler: (response) => void verify(response, order.number),
      modal: {
        ondismiss: () => {
          setPaying(false)
          setProblem((p) => p ?? 'cancelled')
        },
      },
    })
    // Never Razorpay's own (English) error text; the form stays for another try.
    checkout.on('payment.failed', () => {
      setPaying(false)
      setProblem('failed')
    })
    checkout.open()
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
      <section
        aria-labelledby={summaryId}
        className="grid gap-6 rounded-xl border border-border bg-surface p-6 shadow-sm lg:order-last"
      >
        <h2 id={summaryId} className="font-display text-xl font-semibold text-fg">
          {t('summary.title')}
        </h2>
        {summary}
        <CouponForm
          applied={quote.coupon}
          error={couponError}
          busy={quoting}
          onApply={(code) => void applyCoupon(code)}
        />
        <Breakdown quote={quote} busy={quoting} />
      </section>

      <section aria-labelledby={billingId}>
        <h2 id={billingId} className="font-display text-2xl font-semibold text-fg">
          {t('billing.title')}
        </h2>
        <p className="mt-2 text-fg-muted">{t('billing.email', { email })}</p>
        <p className="mt-1 text-sm text-fg-muted">{t('billing.latinHint')}</p>
        <LeadForm form={form} onValid={pay} className="mt-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label={t('billing.name')}
              error={errorText(errors.name)}
              required
              className="sm:col-span-2"
            >
              <Input autoComplete="name" {...register('name')} />
            </FormField>
            <FormField
              label={<OptionalLabel>{t('billing.phone')}</OptionalLabel>}
              error={errorText(errors.phone)}
            >
              <Input type="tel" autoComplete="tel" {...register('phone')} />
            </FormField>
            <FormField
              label={t('billing.state')}
              description={lockedState ? t('billing.stateLocked') : undefined}
              error={errorText(errors.state)}
              required
            >
              {/* Locked to one option rather than disabled: disabled fields aren't submitted. */}
              <Select autoComplete="address-level1" {...register('state')}>
                {!lockedState && <option value="">{t('billing.chooseState')}</option>}
                {stateOptions.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={<OptionalLabel>{t('billing.businessName')}</OptionalLabel>}
              error={errorText(errors.businessName)}
            >
              <Input autoComplete="organization" {...register('businessName')} />
            </FormField>
            <FormField
              label={<OptionalLabel>{t('billing.gstin')}</OptionalLabel>}
              description={
                quote.mode === 'none' ? t('billing.gstinHintOff') : t('billing.gstinHint')
              }
              error={errorText(errors.gstin)}
            >
              <Input
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                {...register('gstin')}
              />
            </FormField>
          </div>
          <FormField error={errorText(errors.accept)} required>
            <Checkbox
              label={t.rich('accept', {
                product: product.name,
                terms: (chunks) => <LegalLink href="/legal/terms">{chunks}</LegalLink>,
                eula: (chunks) => (
                  <LegalLink href={`/legal/eula-${product.slug}`}>{chunks}</LegalLink>
                ),
              })}
              {...register('accept')}
            />
          </FormField>
          <p className="text-sm text-fg-muted">
            {t.rich('policies', {
              refunds: (chunks) => (
                <LegalLink href="/legal/refunds-cancellation">{chunks}</LegalLink>
              ),
              delivery: (chunks) => <LegalLink href="/legal/shipping-delivery">{chunks}</LegalLink>,
            })}
          </p>
          {problem && (
            <Callout
              role="alert"
              tone={
                problem === 'cancelled' ? 'info' : problem === 'rateLimited' ? 'warning' : 'danger'
              }
            >
              {t(`problems.${problem}`)}
            </Callout>
          )}
          <div>
            <span role="status" className="sr-only">
              {paying ? t('paying') : null}
            </span>
            <Button type="submit" size="lg" aria-disabled={paying || undefined}>
              {paying && <Spinner aria-hidden className="size-[1.1em] text-current" />}
              {t('pay', { total: formatINR(locale, quote.total) })}
            </Button>
          </div>
        </LeadForm>
      </section>
    </div>
  )
}

/** Opens in a new tab, so the form keeps what was typed. */
function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const t = useTranslations('checkout')
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className="font-medium text-fg underline underline-offset-4"
    >
      {children}
      <span className="sr-only"> {t('newTab')}</span>
    </Link>
  )
}

/** Its own form, so Enter in the code field applies the coupon instead of paying. */
function CouponForm({
  applied,
  error,
  busy,
  onApply,
}: {
  applied: string | null
  error: CouponProblem | null
  busy: boolean
  onApply: (code: string) => void
}) {
  const t = useTranslations('checkout.coupon')
  const id = useId()
  const [code, setCode] = useState(applied ?? '')
  const hydrated = useHydrated()
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!busy) onApply(code.trim().toUpperCase())
      }}
    >
      <Label htmlFor={id}>{t('label')}</Label>
      {/* Disabled until this hydrates, like LeadForm: a native submit would just reload. */}
      <fieldset disabled={!hydrated} className="mt-1.5 flex min-w-0 gap-2">
        <Input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={32}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-status`}
        />
        <Button type="submit" variant="secondary" aria-disabled={busy || undefined}>
          {t('apply')}
        </Button>
      </fieldset>
      <p id={`${id}-status`} aria-live="polite" className="text-sm">
        {error ? (
          <span className="mt-1.5 flex items-start gap-1.5 text-danger">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t(`errors.${error}`)}
          </span>
        ) : applied ? (
          <span className="mt-1.5 flex items-start gap-1.5 text-fg-muted">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('applied', { code: applied })}
          </span>
        ) : null}
      </p>
    </form>
  )
}

/** The quote: price, coupon, then taxable value + GST lines (none while GST is off) = total. */
function Breakdown({ quote, busy }: { quote: QuoteView; busy: boolean }) {
  const t = useTranslations('checkout.breakdown')
  const locale = useLocale() as Locale
  const inr = (paise: number) => formatINR(locale, paise)
  const rate = (percent: number) =>
    numberFormat(locale, { maximumFractionDigits: 2 }).format(percent)
  const half = rate(quote.ratePercent / 2)
  const rows: [string, number][] = [[t('price'), quote.subtotal]]
  if (quote.discount) rows.push([t('discount', { code: quote.coupon ?? '' }), -quote.discount])
  if (quote.mode !== 'none') rows.push([t('taxable'), quote.taxable])
  if (quote.mode === 'cgst_sgst') {
    rows.push([t('cgst', { rate: half }), quote.cgst], [t('sgst', { rate: half }), quote.sgst])
  }
  if (quote.mode === 'igst') rows.push([t('igst', { rate: rate(quote.ratePercent) }), quote.igst])
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg">{t('title')}</h3>
      <dl aria-live="polite" aria-busy={busy || undefined} className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-fg tabular-nums">{inr(value)}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
          <dt className="text-fg">{quote.mode === 'none' ? t('total') : t('totalInclGst')}</dt>
          <dd className="text-fg tabular-nums">{inr(quote.total)}</dd>
        </div>
      </dl>
    </div>
  )
}
