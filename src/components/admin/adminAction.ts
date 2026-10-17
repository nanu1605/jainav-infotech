/**
 * POSTs to one of the admin action endpoints (src/lib/commerce/adminEndpoint.ts) with the admin
 * session cookie. Payload answers errors as `{ errors: [{ message }] }`.
 */
export async function postAction(
  url: string,
  body: object = {},
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (res.ok) return { ok: true, data }
    const message = (data.errors as { message?: string }[] | undefined)?.[0]?.message
    return { ok: false, message: message || `The request failed (${res.status}).` }
  } catch {
    return { ok: false, message: 'Couldn’t reach the server. Check the connection and try again.' }
  }
}

/** "499.50" → 49950 paise; null unless it is rupees with at most two decimals. */
export function toPaise(rupees: string): number | null {
  const match = rupees
    .trim()
    .replaceAll(',', '')
    .match(/^(\d{1,9})(?:\.(\d{1,2}))?$/)
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : null
}
