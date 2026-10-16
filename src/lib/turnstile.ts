import 'server-only'

// Cloudflare's documented always-pass test secret (pairs with the widget's test site key).
const TEST_SECRET = '1x0000000000000000000000000000000AA'

/** Server-side Turnstile check (spec §13). Fails closed: no secret or no answer means no. */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret =
    process.env.TURNSTILE_SECRET_KEY || (process.env.NODE_ENV === 'production' ? '' : TEST_SECRET)
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set: every form submission is rejected.')
    return false
  }
  if (!token) return false
  const body = new URLSearchParams({ secret, response: token })
  if (ip !== 'unknown') body.set('remoteip', ip)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('Turnstile verification failed:', error instanceof Error ? error.message : error)
    return false
  }
}
