import { describe, expect, it, vi } from 'vitest'

// requireCustomer's dependencies need the database and Next's runtime; safeNext needs neither.
vi.mock('@/i18n/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/account/session', () => ({ getCustomer: vi.fn() }))
vi.mock('@/lib/commerce/store', () => ({ storeOpen: vi.fn() }))

const { safeNext } = await import('@/lib/account/pages')
const { latestPerPlatform, platformParts } = await import('@/lib/account/downloads')

describe('safeNext', () => {
  it('keeps local paths', () => {
    expect(safeNext('/account/orders')).toBe('/account/orders')
    expect(safeNext('/checkout/vyro/pro?coupon=DIWALI')).toBe('/checkout/vyro/pro?coupon=DIWALI')
  })

  it.each([
    undefined,
    ['/account', '/x'],
    '',
    'account',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/a\\b',
    '/account/sign-in',
    '/account/sign-in?next=/account',
  ])('falls back to /account for %j', (value) => {
    expect(safeNext(value)).toBe('/account')
  })
})

describe('latestPerPlatform', () => {
  const release = (id: number, version: string, platform: string, beta = false) => ({
    id,
    version,
    platform,
    channel: beta ? ('beta' as const) : ('stable' as const),
  })

  it('keeps the newest stable build per platform, Windows x64 first', () => {
    const releases = [
      release(1, '1.0.0', 'windows-x86_64'),
      release(2, '1.2.0', 'windows-x86_64'),
      release(3, '1.10.0', 'windows-x86_64'),
      release(4, '2.0.0-beta.1', 'windows-x86_64', true),
      release(5, '1.1.0', 'darwin-aarch64'),
      release(6, '1.0.0', 'windows-aarch64'),
    ]
    expect(latestPerPlatform(releases).map((r) => r.id)).toEqual([3, 5, 6])
  })

  it('leaves out platforms with only betas', () => {
    expect(latestPerPlatform([release(1, '1.0.0-beta.1', 'linux-x86_64', true)])).toEqual([])
  })
})

describe('platformParts', () => {
  it.each([
    ['windows-x86_64', 'windows', 'x86_64'],
    ['darwin-aarch64', 'macos', 'aarch64'],
    ['linux', 'linux', ''],
  ])('%s', (platform, os, arch) => {
    expect(platformParts(platform)).toEqual({ os, arch })
  })
})
