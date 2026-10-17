import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { licensingConfigFrom, type LicensingConfig } from './keyMaterial'

export type { LicensingConfig }

/** Crockford Base32: no I, L, O or U. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** A key's prefix: the product slug in capitals, e.g. `VYRO` (spec §12.2). */
export const keyPrefix = (productSlug: string) =>
  productSlug.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** `VYRO-XXXXX-XXXXX-XXXXX-XXXXX`: 20 Crockford characters, 100 random bits. */
export function generateLicenseKey(prefix: string, bytes = randomBytes(13)): string {
  let bits = 0n
  for (const byte of bytes) bits = (bits << 8n) | BigInt(byte)
  bits >>= BigInt(bytes.length * 8 - 100)
  let body = ''
  for (let i = 0; i < 20; i++) {
    body = CROCKFORD[Number(bits & 31n)] + body
    bits >>= 5n
  }
  return [prefix, ...body.match(/.{5}/g)!].join('-')
}

/** What customers type, made comparable: capitals, no spaces or hyphens, O → 0, I and L → 1. */
export const normalizeLicenseKey = (key: string) =>
  key.toUpperCase().replace(/[\s-]/g, '').replaceAll('O', '0').replace(/[IL]/g, '1')

/** The lookup hash (plain SHA-256: 100 random bits can't be guessed). */
export const hashLicenseKey = (key: string) =>
  createHash('sha256').update(normalizeLicenseKey(key)).digest('hex')

let config: LicensingConfig | null | undefined

/**
 * The signing key, the key-copy encryption key and the device pepper (spec §12, §18.5), or null
 * when production lacks one (the API then answers 503). Development and tests without them use
 * keys derived from PAYLOAD_SECRET, so the store works locally before anything is generated.
 */
export function licensingConfig(): LicensingConfig | null {
  if (config === undefined) config = licensingConfigFrom(process.env)
  return config
}

/** `sha256(deviceId + DEVICE_ID_PEPPER)`: the only form of a device id we store (spec §12.4). */
export const hashDeviceId = (deviceId: string, cfg: LicensingConfig) =>
  createHash('sha256')
    .update(deviceId + cfg.pepper)
    .digest('hex')

/** AES-256-GCM copy of a key, shown to its customer and to Owner / Support: `v1.<iv|tag|data>`. */
export function encryptLicenseKey(key: string, cfg: LicensingConfig): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', cfg.encryptionKey, iv)
  const data = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()])
  return `v1.${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url')}`
}

export function decryptLicenseKey(value: string, cfg: LicensingConfig): string {
  const [version, body] = value.split('.')
  if (version !== 'v1' || !body) throw new Error('Unknown license key format')
  const raw = Buffer.from(body, 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', cfg.encryptionKey, raw.subarray(0, 12))
  decipher.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
}
