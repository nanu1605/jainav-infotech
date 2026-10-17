'use client'

import { Check, Copy, LoaderCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'

import { toast } from '@/components/feedback/Toast'
import { Input } from '@/components/forms/Input'
import { Label } from '@/components/forms/Label'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate } from '@/lib/format'

import { accountPost, useProblemText } from './client'

const DANGER = 'bg-danger text-danger-fg hover:bg-danger/90'

/** The full key in a read-only field, with a Copy button that says "Copied" politely. */
export function CopyKey({ value }: { value: string }) {
  const t = useTranslations('account.licenses')
  const id = useId()
  const [copied, setCopied] = useState<boolean | null>(null)

  // Back to idle, so copying again is announced again.
  useEffect(() => {
    if (copied === null) return
    const timer = setTimeout(() => setCopied(null), 3000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t('key')}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          spellCheck={false}
          autoComplete="off"
          onFocus={(e) => e.currentTarget.select()}
          className="basis-72 grow font-mono sm:max-w-md"
        />
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {t('copy')}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-fg-muted">
        {copied === true ? t('copied') : copied === false ? t('copyFailed') : null}
      </p>
    </div>
  )
}

/**
 * Deactivate one device (spec §11.2) after an inline confirm step. It counts toward the
 * license's monthly limit. Focus moves to `focusAfter` (the devices heading) once it is done,
 * since this device's row goes away.
 */
export function DeactivateDevice({
  activationId,
  device,
  product,
  focusAfter,
}: {
  activationId: number
  device: string
  product: string
  focusAfter: string
}) {
  const t = useTranslations('account.licenses')
  const locale = useLocale() as Locale
  const problemText = useProblemText()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const promptId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  const cancel = () => {
    setConfirming(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const deactivate = async () => {
    if (pending) return
    setPending(true)
    setProblem(null)
    const reply = await accountPost('licenses/deactivate', { activationId })
    // Done, or already gone (the app deactivated it): stays pending until the refreshed list
    // drops this row.
    if (reply.ok || reply.error === 'notFound') {
      toast(
        reply.ok
          ? { title: t('deactivated', { device, product }), tone: 'success' }
          : { title: t('notFound') },
      )
      document.getElementById(focusAfter)?.focus()
      router.refresh()
      return
    }
    setPending(false)
    cancel()
    setProblem(
      reply.error === 'deactivationLimit' && reply.resetsAt
        ? t('limitReached', { date: formatDate(locale, reply.resetsAt) })
        : problemText(reply),
    )
  }

  return (
    <div className={confirming || problem ? 'grid basis-full gap-3' : undefined}>
      {problem && (
        <Callout role="alert" tone="danger">
          {problem}
        </Callout>
      )}
      {confirming ? (
        <div className="grid gap-3 rounded-md border border-danger/40 p-4">
          <p id={promptId} className="text-sm text-fg">
            {t('confirm', { device, product })}
          </p>
          <span role="status" className="sr-only">
            {pending ? t('pending') : null}
          </span>
          <div className="flex flex-wrap gap-3">
            <Button
              ref={confirmRef}
              size="sm"
              className={DANGER}
              aria-describedby={promptId}
              aria-disabled={pending || undefined}
              onClick={deactivate}
            >
              {pending && (
                <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
              )}
              {pending ? t('pending') : t('confirmButton')}
            </Button>
            <Button size="sm" variant="secondary" onClick={cancel}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          ref={triggerRef}
          size="sm"
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            setProblem(null)
            setConfirming(true)
          }}
        >
          {t('deactivate')}
          <span className="sr-only"> {device}</span>
        </Button>
      )}
    </div>
  )
}
