'use client'

import { Check, LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, type ReactNode } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Link } from '@/i18n/navigation'
import type { SubmitError } from '@/lib/forms/client'
import { cn } from '@/lib/cn'
import { useHydrated } from '@/lib/useHydrated'

// Light pieces shared by the lead forms (spec §13). The submit hook and its spam checks live in
// useLeadSubmit.tsx, so a placeholder can use these without loading Turnstile.

export type FormProblem = SubmitError | 'verificationPending'

/** Zod messages are keys into `forms.errors`. */
export function useErrorText() {
  const t = useTranslations('forms.errors')
  return (error?: { message?: string }) => (error?.message ? t(error.message) : undefined)
}

export function OptionalLabel({ children }: { children: ReactNode }) {
  const t = useTranslations('forms.fields')
  return (
    <>
      {children} <span className="font-normal text-fg-muted">{t('optional')}</span>
    </>
  )
}

/** <form> over react-hook-form that ignores submits while one is in flight. */
export function LeadForm<TIn extends FieldValues, TOut>({
  form,
  onValid,
  className,
  children,
}: {
  form: UseFormReturn<TIn, unknown, TOut>
  onValid: (values: TOut) => Promise<unknown>
  className?: string
  children: ReactNode
}) {
  const submit = form.handleSubmit(onValid)
  const hydrated = useHydrated()
  return (
    <form
      noValidate
      className={cn('relative grid gap-5', className)}
      onSubmit={(e) => {
        // The button stays enabled (aria-disabled) so it keeps focus: block double submits.
        if (form.formState.isSubmitting) e.preventDefault()
        else void submit(e)
      }}
    >
      {/* Disabled in the server HTML until this hydrates (the form code loads late, see lazy.tsx):
          text typed before then would be reset, and a native submit would put the fields in the
          URL. */}
      <fieldset disabled={!hydrated} className="contents">
        {children}
      </fieldset>
    </form>
  )
}

export function ConsentNotice({
  kind = 'notice',
  className,
}: {
  kind?: 'notice' | 'newsletter'
  className?: string
}) {
  const t = useTranslations('forms.consent')
  return (
    <p className={cn('text-sm text-fg-muted', className)}>
      {t.rich(kind, {
        privacy: (chunks) => (
          <Link href="/legal/privacy" className="text-fg underline underline-offset-4">
            {chunks}
          </Link>
        ),
      })}
    </p>
  )
}

export function ProblemMessage({ problem }: { problem: FormProblem | null }) {
  const t = useTranslations('forms.status')
  if (!problem) return null
  return (
    <Callout role="alert" tone={problem === 'verificationPending' ? 'info' : 'danger'}>
      {t(problem)}
    </Callout>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  const t = useTranslations('forms.status')
  return (
    <>
      <span role="status" className="sr-only">
        {pending ? t('sending') : null}
      </span>
      <Button type="submit" aria-disabled={pending || undefined}>
        {pending && <LoaderCircle aria-hidden className="animate-spin" />}
        {pending ? t('sending') : children}
      </Button>
    </>
  )
}

/** Server problem, consent notice and submit button, closing every single-step form. */
export function FormActions({
  problem,
  pending,
  label,
  notice,
}: {
  problem: FormProblem | null
  pending: boolean
  label: string
  notice?: 'notice' | 'newsletter'
}) {
  return (
    <div className="grid gap-4">
      <ProblemMessage problem={problem} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <ConsentNotice kind={notice} className="min-w-0 flex-1 basis-64" />
        <SubmitButton pending={pending}>{label}</SubmitButton>
      </div>
    </div>
  )
}

/** Replaces a sent form; takes focus so the confirmation is read out. */
export function SuccessPanel({
  title,
  text,
  level = 3,
}: {
  title: string
  text: string
  level?: 2 | 3 | 4
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const Heading = `h${level}` as const
  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="flex gap-4 rounded-xl border border-success/40 bg-success/10 p-6 outline-none"
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-success-fg"
      >
        <Check className="size-5" />
      </span>
      <div className="min-w-0 pt-0.5">
        <Heading className="font-display text-lg font-semibold text-fg">{title}</Heading>
        <p className="mt-1 text-fg-muted">{text}</p>
      </div>
    </div>
  )
}
