import 'server-only'

import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

import { SITE_URL } from './seo'

/** A random URL-safe token (256 bits); store only its sha256 (rateLimit.ts). */
export const randomToken = () => randomBytes(32).toString('base64url')

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Random characters for a number people read out: 8 are 40 bits, revealing nothing about volume. */
export const randomCode = (length: number) =>
  Array.from({ length }, () => CROCKFORD[randomInt(32)]).join('')

const sign = (value: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET ?? '')
    .update(`unsubscribe:${value}`)
    .digest('base64url')

/**
 * Unsubscribe links must keep working in every email ever sent, so the token is the lead id
 * signed with PAYLOAD_SECRET rather than a stored value. Rotating the secret breaks old links.
 */
export const unsubscribeToken = (leadId: number | string) => `${leadId}.${sign(String(leadId))}`

/** The lead id an unsubscribe token was issued for, or null if it is forged or malformed. */
export function verifyUnsubscribeToken(token: string): number | null {
  const [id, signature] = token.split('.')
  if (!id || !signature || !/^\d{1,10}$/.test(id)) return null
  const expected = Buffer.from(sign(id))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given) ? Number(id) : null
}

export const unsubscribeUrl = (leadId: number | string) =>
  `${SITE_URL}/api/v1/forms/unsubscribe?token=${unsubscribeToken(leadId)}`

/** One-click unsubscribe (RFC 8058) for every marketing email (spec §13). */
export const unsubscribeHeaders = (leadId: number | string) => ({
  'List-Unsubscribe': `<${unsubscribeUrl(leadId)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})
