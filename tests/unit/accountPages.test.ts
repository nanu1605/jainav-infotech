import { describe, expect, it, vi } from 'vitest'

// requireCustomer's dependencies need the database and Next's runtime; safeNext needs neither.
vi.mock('@/i18n/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/account/session', () => ({ getCustomer: vi.fn() }))
vi.mock('@/lib/commerce/store', () => ({ storeOpen: vi.fn() }))

const { safeNext } = await import('@/lib/account/pages')

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
