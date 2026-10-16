'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useNow, useTranslations } from 'next-intl'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useForm } from 'react-hook-form'
import * as z from 'zod/mini'

import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/forms/Input'
import { LeadForm, SubmitButton } from '@/components/forms/LeadForm'
import { OTPInput } from '@/components/forms/OTPInput'
import { TurnstileWidget } from '@/components/forms/TurnstileWidget'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Link, useRouter } from '@/i18n/navigation'
import { emailSchema, otpVerifySchema } from '@/lib/commerce/schemas'

import { accountPost, useErrorText, useProblemText } from './client'

const emailStep = z.object({ email: emailSchema })
const codeStep = z.object({ code: otpVerifySchema.shape.code })

/**
 * Email-code sign-in (spec §11.2) in two steps: email + Turnstile → a 6-digit code. The first
 * sign-in creates the account. `next` is a checked local path (lib/account/pages safeNext).
 */
export function SignInForm({ next }: { next: string }) {
  const t = useTranslations('account.signIn')
  const locale = useLocale()
  const router = useRouter()
  const errorText = useErrorText()
  const problemText = useProblemText()
  /** null: step 1 (email); otherwise step 2 (code sent to this address). */
  const [email, setEmail] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [token, setToken] = useState<string | null>(null)
  // Turnstile tokens are single-use: every request remounts the widget for a fresh one.
  const [widget, setWidget] = useState(0)
  const [signedIn, setSignedIn] = useState(false)

  const emailForm = useForm({
    resolver: zodResolver(emailStep),
    defaultValues: { email: '' },
    mode: 'onTouched',
  })
  const codeForm = useForm({ resolver: zodResolver(codeStep), defaultValues: { code: '' } })

  const request = async (address: string) => {
    setProblem(null)
    if (!token) return setProblem(problemText({ error: 'verificationPending' }))
    const reply = await accountPost('otp/request', { email: address, locale, turnstile: token })
    setToken(null)
    setWidget((n) => n + 1)
    // cooldown: a code went to this address moments ago, so it can be entered now.
    if (reply.ok || reply.error === 'cooldown') {
      setResendAt(Date.now() + ((reply.ok ? reply.resendIn : reply.retryAfter) ?? 60) * 1000)
      if (email !== null) {
        if (reply.ok) setAnnouncement(t('resent', { email: address }))
        return
      }
      // Reset before the code step mounts: reset() drops registered fields, so a setFocus
      // after it would find nothing to focus.
      codeForm.reset()
      flushSync(() => setEmail(address))
      codeForm.setFocus('code')
      setAnnouncement(t('sent', { email: address }))
      return
    }
    if (reply.error === 'invalid' && email === null) {
      return emailForm.setError('email', { message: 'email' }, { shouldFocus: true })
    }
    setProblem(problemText(reply))
  }

  const verify = async (code: string) => {
    setProblem(null)
    const reply = await accountPost('otp/verify', { email, code })
    if (reply.ok) {
      setSignedIn(true)
      setAnnouncement(t('signedIn'))
      router.replace(next)
      router.refresh()
      return
    }
    if (reply.error === 'invalidCode') {
      codeForm.setError('code', {
        type: 'server',
        message: t('invalidCode', { count: reply.attemptsLeft ?? 0 }),
      })
      return codeForm.setFocus('code', { shouldSelect: true })
    }
    if (reply.error === 'codeExpired') codeForm.reset()
    setProblem(problemText(reply))
  }

  const back = () => {
    setProblem(null)
    setAnnouncement('')
    flushSync(() => setEmail(null))
    emailForm.setFocus('email', { shouldSelect: true })
  }

  const alert = problem && (
    <Callout role="alert" tone="danger">
      {problem}
    </Callout>
  )

  return (
    <div className="grid gap-6">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {email === null ? (
        <LeadForm form={emailForm} onValid={(values) => request(values.email)}>
          <FormField
            label={t('email')}
            error={errorText(emailForm.formState.errors.email)}
            required
          >
            <Input type="email" autoComplete="email" {...emailForm.register('email')} />
          </FormField>
          <TurnstileWidget key={widget} onToken={setToken} />
          {alert}
          <div>
            <SubmitButton pending={emailForm.formState.isSubmitting}>{t('sendCode')}</SubmitButton>
          </div>
        </LeadForm>
      ) : (
        <>
          <LeadForm form={codeForm} onValid={(values) => verify(values.code)}>
            <FormField
              label={t('code')}
              description={t('sent', { email })}
              error={errorText(codeForm.formState.errors.code)}
              required
            >
              <OTPInput {...codeForm.register('code')} />
            </FormField>
            {alert}
            <div>
              <SubmitButton pending={codeForm.formState.isSubmitting || signedIn}>
                {t('verify')}
              </SubmitButton>
            </div>
          </LeadForm>
          <div className="grid gap-4 border-t border-border pt-6">
            <p className="text-sm text-fg-muted">{t('noCode')}</p>
            <TurnstileWidget key={widget} onToken={setToken} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <ResendButton resendAt={resendAt} onResend={() => request(email)} />
              <Button variant="link" onClick={back}>
                {t('changeEmail')}
              </Button>
            </div>
          </div>
        </>
      )}
      <p className="text-sm text-fg-muted">
        {t.rich('firstTime', {
          privacy: (chunks) => (
            <Link href="/legal/privacy" className="text-fg underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  )
}

/** "Send a new code", counting down the cooldown. aria-disabled keeps focus on it meanwhile. */
function ResendButton({ resendAt, onResend }: { resendAt: number; onResend: () => Promise<void> }) {
  const t = useTranslations('account.signIn')
  const now = useNow({ updateInterval: 1000 })
  const [pending, setPending] = useState(false)
  const wait = Math.max(0, Math.ceil((resendAt - now.getTime()) / 1000))
  const blocked = wait > 0 || pending

  return (
    <Button
      variant="secondary"
      aria-disabled={blocked || undefined}
      onClick={async () => {
        if (blocked) return
        setPending(true)
        await onResend()
        setPending(false)
      }}
    >
      {wait > 0 ? t('resendIn', { count: wait }) : t('resend')}
    </Button>
  )
}
