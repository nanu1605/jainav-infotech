import 'server-only'

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  randomBytes,
  type KeyObject,
} from 'node:crypto'

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

export type LicensingConfig = {
  privateKey: KeyObject
  publicKey: KeyObject
  kid: string
  encryptionKey: Buffer
  pepper: string
}

// PKCS#8 DER header of an Ed25519 private key; the 32-byte seed follows.
const ED25519_PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex')

function readPrivateKey(value: string): KeyObject {
  const pem = value.replace(/\\n/g, '\n')
  const key = pem.includes('BEGIN')
    ? createPrivateKey(pem)
    : createPrivateKey({ key: Buffer.from(value, 'base64'), format: 'der', type: 'pkcs8' })
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('LICENSING_PRIVATE_KEY is not Ed25519')
  return key
}

let config: LicensingConfig | null | undefined

/**
 * The signing key, the key-copy encryption key and the device pepper (spec §12, §18.5), or null
 * when production lacks one (the API then answers 503). Development and tests without them use
 * keys derived from PAYLOAD_SECRET, so the store works locally before anything is generated.
 */
export function licensingConfig(): LicensingConfig | null {
  if (config !== undefined) return config
  const env = process.env
  const configured =
    env.LICENSING_PRIVATE_KEY &&
    env.LICENSING_KEY_ID &&
    env.LICENSE_KEY_ENCRYPTION_KEY &&
    env.DEVICE_ID_PEPPER
  if (configured) {
    const privateKey = readPrivateKey(env.LICENSING_PRIVATE_KEY!)
    const encryptionKey = Buffer.from(env.LICENSE_KEY_ENCRYPTION_KEY!, 'base64')
    if (encryptionKey.length !== 32) throw new Error('LICENSE_KEY_ENCRYPTION_KEY is not 32 bytes')
    config = {
      privateKey,
      publicKey: createPublicKey(privateKey),
      kid: env.LICENSING_KEY_ID!,
      encryptionKey,
      pepper: env.DEVICE_ID_PEPPER!,
    }
  } else if (env.NODE_ENV !== 'production' && env.PAYLOAD_SECRET) {
    const derive = (info: string) =>
      Buffer.from(hkdfSync('sha256', env.PAYLOAD_SECRET!, 'jainav-dev-licensing', info, 32))
    const privateKey = createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8, derive('signing')]),
      format: 'der',
      type: 'pkcs8',
    })
    config = {
      privateKey,
      publicKey: createPublicKey(privateKey),
      kid: 'dev',
      encryptionKey: derive('key-copy'),
      pepper: derive('device-pepper').toString('base64'),
    }
  } else {
    config = null
  }
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
