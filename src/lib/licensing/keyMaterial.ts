// No 'server-only' here: scripts/license-test-client signs aged tokens with the same keys.
import { createPrivateKey, createPublicKey, hkdfSync, type KeyObject } from 'node:crypto'

export type LicensingConfig = {
  privateKey: KeyObject
  publicKey: KeyObject
  kid: string
  encryptionKey: Buffer
  pepper: string
}

// PKCS#8 DER header of an Ed25519 private key; the 32-byte seed follows.
const ED25519_PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex')

/** LICENSING_PRIVATE_KEY: PEM (literal `\n` allowed) or one line of base64 PKCS#8 DER. */
function readPrivateKey(value: string): KeyObject {
  const pem = value.replace(/\\n/g, '\n')
  const key = pem.includes('BEGIN')
    ? createPrivateKey(pem)
    : createPrivateKey({ key: Buffer.from(value, 'base64'), format: 'der', type: 'pkcs8' })
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('LICENSING_PRIVATE_KEY is not Ed25519')
  return key
}

/**
 * The licensing keys from `env`: all four variables, or in development and tests keys derived
 * from PAYLOAD_SECRET (kid `dev`); null when production lacks them.
 */
export function licensingConfigFrom(env: NodeJS.ProcessEnv): LicensingConfig | null {
  const configured =
    env.LICENSING_PRIVATE_KEY &&
    env.LICENSING_KEY_ID &&
    env.LICENSE_KEY_ENCRYPTION_KEY &&
    env.DEVICE_ID_PEPPER
  if (configured) {
    const privateKey = readPrivateKey(env.LICENSING_PRIVATE_KEY!)
    const encryptionKey = Buffer.from(env.LICENSE_KEY_ENCRYPTION_KEY!, 'base64')
    if (encryptionKey.length !== 32) throw new Error('LICENSE_KEY_ENCRYPTION_KEY is not 32 bytes')
    return {
      privateKey,
      publicKey: createPublicKey(privateKey),
      kid: env.LICENSING_KEY_ID!,
      encryptionKey,
      pepper: env.DEVICE_ID_PEPPER!,
    }
  }
  if (env.NODE_ENV !== 'production' && env.PAYLOAD_SECRET) {
    const derive = (info: string) =>
      Buffer.from(hkdfSync('sha256', env.PAYLOAD_SECRET!, 'jainav-dev-licensing', info, 32))
    const privateKey = createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8, derive('signing')]),
      format: 'der',
      type: 'pkcs8',
    })
    return {
      privateKey,
      publicKey: createPublicKey(privateKey),
      kid: 'dev',
      encryptionKey: derive('key-copy'),
      pepper: derive('device-pepper').toString('base64'),
    }
  }
  return null
}
