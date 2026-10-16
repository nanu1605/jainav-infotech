import type { FormMeta, FormName } from './schemas'

export type SubmitError = 'invalid' | 'verification' | 'rateLimited' | 'server'
export type SubmitResult = { ok: true } | { ok: false; error: SubmitError }

const UTM = ['source', 'medium', 'campaign', 'term', 'content'] as const

/**
 * Posts a form to /api/v1/forms/{form} (spec §13). Fields go as JSON next to where the form was
 * filled in and the spam checks; a CV goes as a file. Multipart, so files and fields travel
 * together.
 */
export async function submitForm(
  form: FormName,
  values: Record<string, unknown>,
  extra: { locale: string; turnstile: string; website: string; cv?: File },
): Promise<SubmitResult> {
  const params = new URLSearchParams(location.search)
  const meta: Omit<FormMeta, 'locale'> & { locale: string } = {
    locale: extra.locale,
    page: location.pathname,
    referrer: document.referrer,
    utm: Object.fromEntries(
      UTM.flatMap((k) => (params.get(`utm_${k}`) ? [[k, params.get(`utm_${k}`)!]] : [])),
    ),
    website: extra.website,
    turnstile: extra.turnstile,
  }
  const body = new FormData()
  body.set('data', JSON.stringify(values))
  body.set('meta', JSON.stringify(meta))
  if (extra.cv) body.set('cv', extra.cv)
  try {
    const res = await fetch(`/api/v1/forms/${form}`, { method: 'POST', body })
    if (res.ok) return { ok: true }
    const data = (await res.json().catch(() => ({}))) as { error?: SubmitError }
    return { ok: false, error: data.error ?? 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}
