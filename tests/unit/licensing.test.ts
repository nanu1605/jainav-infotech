import { generateKeyPairSync } from 'node:crypto'

import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import { addMonthsIST, istMonthStart } from '@/lib/licensing/dates'
import {
  decryptLicenseKey,
  encryptLicenseKey,
  generateLicenseKey,
  hashDeviceId,
  hashLicenseKey,
  keyPrefix,
  licensingConfig,
  normalizeLicenseKey,
  type LicensingConfig,
} from '@/lib/licensing/keys'
import { jwks, signToken, verifyToken } from '@/lib/licensing/tokens'

process.env.PAYLOAD_SECRET ??= 'unit-test-secret'
const cfg = licensingConfig() as LicensingConfig
const DAY = 86_400
const now = new Date('2026-10-17T06:00:00Z')
const t = Math.floor(now.getTime() / 1000)
const claims = (iat: number, exp: number) => ({
  sub: '42',
  prd: 'vyro',
  pln: 'pro',
  did: 'a'.repeat(64),
  upd: null,
  iat,
  exp,
})

describe('license keys (spec §12.2)', () => {
  it('formats a prefix and four groups of five Crockford characters', () => {
    expect(keyPrefix('vyro')).toBe('VYRO')
    const key = generateLicenseKey('VYRO')
    expect(key).toMatch(/^VYRO(-[0-9A-HJKMNP-TV-Z]{5}){4}$/)
    expect(generateLicenseKey('VYRO')).not.toBe(key)
  })

  it('uses exactly 100 random bits', () => {
    expect(generateLicenseKey('X', Buffer.alloc(13))).toBe('X-00000-00000-00000-00000')
    expect(generateLicenseKey('X', Buffer.alloc(13, 0xff))).toBe('X-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ')
    // The last 4 bits of the 13th byte are dropped.
    expect(generateLicenseKey('X', Buffer.from([...Array(12).fill(0), 0x0f]))).toBe(
      'X-00000-00000-00000-00000',
    )
    expect(generateLicenseKey('X', Buffer.from([...Array(12).fill(0), 0x10]))).toBe(
      'X-00000-00000-00000-00001',
    )
  })

  it('normalizes what customers type before hashing', () => {
    const key = 'VYRO-7K2QD-M9X4T-BH3NC-PW8RA'
    expect(normalizeLicenseKey(' vyro 7k2qd-m9x4t bh3nc pw8ra ')).toBe(normalizeLicenseKey(key))
    expect(normalizeLicenseKey('O0-Il1-o')).toBe('001110')
    expect(hashLicenseKey('vyro-7K2QD-M9X4T-BH3NC-PW8RA')).toBe(hashLicenseKey(key))
    expect(hashLicenseKey(key)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashLicenseKey('VYRO-7K2QD-M9X4T-BH3NC-PW8RB')).not.toBe(hashLicenseKey(key))
  })

  it('round-trips the encrypted copy and refuses a tampered one', () => {
    const key = generateLicenseKey('VYRO')
    const stored = encryptLicenseKey(key, cfg)
    expect(stored).toMatch(/^v1\./)
    expect(stored).not.toContain(key)
    expect(encryptLicenseKey(key, cfg)).not.toBe(stored)
    expect(decryptLicenseKey(stored, cfg)).toBe(key)
    const body = Buffer.from(stored.slice(3), 'base64url')
    body[body.length - 1]! ^= 1
    expect(() => decryptLicenseKey(`v1.${body.toString('base64url')}`, cfg)).toThrow()
  })

  it('stores device ids only peppered and hashed', () => {
    const id = 'b'.repeat(64)
    expect(hashDeviceId(id, cfg)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashDeviceId(id, cfg)).not.toBe(hashDeviceId(id, { ...cfg, pepper: 'other' }))
  })
})

describe('license tokens (spec §12.3)', () => {
  it('signs EdDSA tokens with a kid that the JWKS key verifies', async () => {
    const token = await signToken(claims(t, t + 30 * DAY), cfg)
    const [header] = token.split('.')
    expect(JSON.parse(Buffer.from(header!, 'base64url').toString())).toEqual({
      alg: 'EdDSA',
      typ: 'JWT',
      kid: cfg.kid,
    })
    expect(await verifyToken(token, cfg, 180, now)).toMatchObject({
      sub: '42',
      prd: 'vyro',
      pln: 'pro',
      upd: null,
      exp: t + 30 * DAY,
    })
    expect(jwks(cfg).keys[0]).toMatchObject({
      kty: 'OKP',
      crv: 'Ed25519',
      alg: 'EdDSA',
      kid: cfg.kid,
    })
  })

  it('accepts a token up to 180 days past exp, not later', async () => {
    const expired100 = await signToken(claims(t - 130 * DAY, t - 100 * DAY), cfg)
    expect(await verifyToken(expired100, cfg, 180, now)).not.toBeNull()
    const expired181 = await signToken(claims(t - 211 * DAY, t - 181 * DAY), cfg)
    expect(await verifyToken(expired181, cfg, 180, now)).toBeNull()
  })

  it('refuses another key, another kid, another issuer and other algorithms', async () => {
    const other = generateKeyPairSync('ed25519')
    const foreign = await signToken(claims(t, t + DAY), { ...cfg, privateKey: other.privateKey })
    expect(await verifyToken(foreign, cfg, 180, now)).toBeNull()
    const otherKid = await signToken(claims(t, t + DAY), { ...cfg, kid: 'old' })
    expect(await verifyToken(otherKid, cfg, 180, now)).toBeNull()
    const hs = await new SignJWT(claims(t, t + DAY))
      .setProtectedHeader({ alg: 'HS256', kid: cfg.kid })
      .setIssuer('jainav-licensing')
      .sign(new TextEncoder().encode('x'.repeat(32)))
    expect(await verifyToken(hs, cfg, 180, now)).toBeNull()
    const none = `${Buffer.from(JSON.stringify({ alg: 'none', kid: cfg.kid })).toString('base64url')}.${Buffer.from(JSON.stringify({ ...claims(t, t + DAY), iss: 'jainav-licensing' })).toString('base64url')}.`
    expect(await verifyToken(none, cfg, 180, now)).toBeNull()
    const wrongIssuer = await new SignJWT(claims(t, t + DAY))
      .setProtectedHeader({ alg: 'EdDSA', kid: cfg.kid })
      .setIssuer('someone-else')
      .sign(cfg.privateKey)
    expect(await verifyToken(wrongIssuer, cfg, 180, now)).toBeNull()
    expect(await verifyToken('not-a-token', cfg, 180, now)).toBeNull()
  })
})

describe('licensing dates in India time', () => {
  it('adds calendar months, keeping the IST day and clamping month ends', () => {
    expect(addMonthsIST(new Date('2026-10-17T06:00:00Z'), 12).toISOString()).toBe(
      '2027-10-17T06:00:00.000Z',
    )
    // 31 Jan 00:30 IST (still 30 Jan in UTC) + 1 month → 28 Feb 00:30 IST.
    expect(addMonthsIST(new Date('2027-01-30T19:00:00Z'), 1).toISOString()).toBe(
      '2027-02-27T19:00:00.000Z',
    )
    expect(addMonthsIST(new Date('2028-01-31T06:00:00Z'), 1).toISOString()).toBe(
      '2028-02-29T06:00:00.000Z',
    )
  })

  it('starts months at midnight IST', () => {
    expect(istMonthStart(new Date('2026-10-17T06:00:00Z')).toISOString()).toBe(
      '2026-09-30T18:30:00.000Z',
    )
    expect(istMonthStart(new Date('2026-10-17T06:00:00Z'), 1).toISOString()).toBe(
      '2026-10-31T18:30:00.000Z',
    )
    // 1 Nov 00:10 IST is still 31 Oct in UTC, but November in India.
    expect(istMonthStart(new Date('2026-10-31T18:40:00Z')).toISOString()).toBe(
      '2026-10-31T18:30:00.000Z',
    )
    expect(istMonthStart(new Date('2026-12-15T00:00:00Z'), 1).toISOString()).toBe(
      '2026-12-31T18:30:00.000Z',
    )
  })
})
