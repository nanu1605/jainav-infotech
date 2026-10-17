import { useTranslations } from 'next-intl'

import type { StoreError } from '@/lib/commerce/schemas'

/** An account endpoint's answer: `{ ok: true, … }`, or `{ error, … }` with a 4xx/5xx status. */
export type AccountReply = {
  ok?: true
  error?: StoreError | 'verificationPending'
  resendIn?: number
  retryAfter?: number
  attemptsLeft?: number
  field?: string
}

/** POSTs JSON to /api/v1/account/{path}. Never throws: a network failure is `server`. */
export async function accountPost(path: string, body: object = {}): Promise<AccountReply> {
  try {
    const res = await fetch(`/api/v1/account/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as AccountReply
    return res.ok
      ? { ...data, ok: true, error: undefined }
      : { ...data, error: data.error ?? 'server' }
  } catch {
    return { error: 'server' }
  }
}

const PROBLEMS = new Set([
  'invalid',
  'verification',
  'verificationPending',
  'rateLimited',
  'cooldown',
  'codeExpired',
  'signedOut',
  'server',
])

/** A failed reply as a sentence; rate limits say how long to wait. */
export function useProblemText() {
  const t = useTranslations('account')
  return (reply: AccountReply) => {
    const s = Math.max(1, reply.retryAfter ?? 60)
    const wait =
      s >= 60 ? t('wait.minutes', { count: Math.ceil(s / 60) }) : t('wait.seconds', { count: s })
    const key = reply.error && PROBLEMS.has(reply.error) ? reply.error : 'server'
    return t(`problems.${key}`, { wait })
  }
}

/**
 * Field errors: schema messages are keys into `account.errors`; errors the server reports are
 * set already translated, with type `server`.
 */
export function useErrorText() {
  const t = useTranslations('account.errors')
  return (error?: { type?: string; message?: string }) =>
    !error?.message ? undefined : error.type === 'server' ? error.message : t(error.message)
}
