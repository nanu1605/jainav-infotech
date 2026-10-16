'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRef, useState, type RefObject } from 'react'

import { submitForm } from '@/lib/forms/client'
import type { FormName } from '@/lib/forms/schemas'

import type { FormProblem } from './LeadForm'
import { TurnstileWidget } from './TurnstileWidget'

/**
 * Sends a lead form (spec §13) with its spam checks: a honeypot and a Turnstile token. Render
 * `spamChecks` inside the form. Tokens are single-use, so a failed attempt remounts the widget.
 */
export function useLeadSubmit(form: FormName) {
  const locale = useLocale()
  const honeypot = useRef<HTMLInputElement>(null)
  const [token, setToken] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [problem, setProblem] = useState<FormProblem | null>(null)
  const [sent, setSent] = useState(false)

  /** Resolves to the server's answer (none while verification is pending). */
  const submit = async (values: Record<string, unknown>, cv?: File) => {
    setProblem(null)
    if (!token) return setProblem('verificationPending')
    const result = await submitForm(form, values, {
      locale,
      turnstile: token,
      website: honeypot.current?.value ?? '',
      cv,
    })
    if (result.ok) {
      setSent(true)
      return result
    }
    setToken(null)
    setAttempt((n) => n + 1)
    // A refused field is marked on the field itself.
    if (!result.field) setProblem(result.error)
    return result
  }

  const onToken = (value: string | null) => {
    setToken(value)
    if (value) setProblem((p) => (p === 'verificationPending' ? null : p))
  }

  return {
    submit,
    sent,
    problem,
    spamChecks: <SpamChecks key={attempt} honeypot={honeypot} onToken={onToken} />,
  }
}

function SpamChecks({
  honeypot,
  onToken,
}: {
  honeypot: RefObject<HTMLInputElement | null>
  onToken: (token: string | null) => void
}) {
  const t = useTranslations('forms')
  return (
    <>
      {/* Honeypot: off-screen and hidden from assistive tech, so only bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          {t('honeypot')}
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <TurnstileWidget onToken={onToken} />
    </>
  )
}
