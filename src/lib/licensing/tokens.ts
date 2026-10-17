import 'server-only'

import { errors, jwtVerify, SignJWT, type JWK } from 'jose'
import { z } from 'zod/mini'

import type { LicensingConfig } from './keys'

export const ISSUER = 'jainav-licensing'
const DAY = 86_400

export type TokenClaims = {
  /** License id, or `trial:<id>`. */
  sub: string
  prd: string
  /** Plan code, `trial` for trials. */
  pln: string
  did: string
  /** End of the update period (seconds), null for lifetime updates. */
  upd: number | null
  iat: number
  exp: number
}

/** A license or trial token (spec §12.3): EdDSA, `kid` in the header. */
export const signToken = ({ sub, iat, exp, ...claims }: TokenClaims, cfg: LicensingConfig) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: cfg.kid })
    .setIssuer(ISSUER)
    .setSubject(sub)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(cfg.privateKey)

const claimsSchema = z.object({
  sub: z.string().check(z.minLength(1)),
  prd: z.string(),
  pln: z.string(),
  did: z.string(),
  upd: z.nullable(z.number()),
  iat: z.number(),
  exp: z.number(),
})

/**
 * A token's claims if its signature is ours and it expired at most `graceDays` ago (spec §12.3:
 * /validate re-issues tokens up to 180 days past `exp`); null otherwise. The algorithm is pinned.
 */
export async function verifyToken(
  token: string,
  cfg: LicensingConfig,
  graceDays: number,
  now = new Date(),
): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      (header) => {
        if (header.kid !== cfg.kid) throw new errors.JWKSNoMatchingKey()
        return cfg.publicKey
      },
      {
        algorithms: ['EdDSA'],
        issuer: ISSUER,
        clockTolerance: graceDays * DAY,
        currentDate: now,
        requiredClaims: ['sub', 'iat', 'exp'],
      },
    )
    const claims = claimsSchema.safeParse(payload)
    return claims.success ? claims.data : null
  } catch (error) {
    if (error instanceof errors.JOSEError) return null
    throw error
  }
}

/** The public key as a JWKS (spec §12.3, `GET /keys`). */
export function jwks(cfg: LicensingConfig): { keys: JWK[] } {
  const { kty, crv, x } = cfg.publicKey.export({ format: 'jwk' })
  return { keys: [{ kty, crv, x, kid: cfg.kid, alg: 'EdDSA', use: 'sig' }] }
}

export const seconds = (date: Date) => Math.floor(date.getTime() / 1000)
export { DAY }
