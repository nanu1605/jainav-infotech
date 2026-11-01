import { afterEach, describe, expect, it, vi } from 'vitest'

const cookieIsSecure = async () => {
  vi.resetModules()
  const { Users } = await import('@/collections/Users')
  return (Users.auth as { cookies?: { secure?: boolean } }).cookies?.secure
}

describe('payload-token', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is flagged Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(await cookieIsSecure()).toBe(true)
  })

  it('stays usable on plain http in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(await cookieIsSecure()).toBe(false)
  })
})
