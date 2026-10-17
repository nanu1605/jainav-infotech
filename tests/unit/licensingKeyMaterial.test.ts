import { generateKeyPairSync, randomBytes } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { licensingConfigFrom } from '@/lib/licensing/keyMaterial'

describe('licensing keys from the environment', () => {
  it('reads what pnpm gen:licensing-keys prints, as DER or PEM, and refuses dev keys in production', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const secrets = {
      LICENSING_KEY_ID: '2026-10',
      LICENSE_KEY_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      DEVICE_ID_PEPPER: randomBytes(32).toString('base64'),
      NODE_ENV: 'production' as const,
    }
    const x = publicKey.export({ format: 'jwk' }).x
    for (const key of [
      privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
      (privateKey.export({ format: 'pem', type: 'pkcs8' }) as string).replace(/\n/g, '\\n'),
    ]) {
      const cfg = licensingConfigFrom({ ...secrets, LICENSING_PRIVATE_KEY: key })!
      expect(cfg.kid).toBe('2026-10')
      expect(cfg.publicKey.export({ format: 'jwk' }).x).toBe(x)
    }
    expect(licensingConfigFrom({ NODE_ENV: 'production', PAYLOAD_SECRET: 's' })).toBeNull()
    expect(licensingConfigFrom({ NODE_ENV: 'development', PAYLOAD_SECRET: 's' })?.kid).toBe('dev')
  })
})
