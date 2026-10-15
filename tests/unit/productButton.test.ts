import { describe, expect, it } from 'vitest'

import { validateProductButton } from '@/fields/productButton'

const external = { hostingMode: 'external', externalUrl: 'https://menumesh.example' } as const
const hosted = { hostingMode: 'hosted', externalUrl: null } as const

describe('validateProductButton (spec §8.5)', () => {
  it('accepts an empty optional button', () => {
    expect(validateProductButton(undefined, external)).toBe(true)
    expect(validateProductButton({ type: null }, hosted)).toBe(true)
  })

  it('visit requires the external URL', () => {
    expect(validateProductButton({ type: 'visit' }, external)).toBe(true)
    expect(validateProductButton({ type: 'visit' }, hosted)).toMatch(/external URL/)
  })

  it('buy is only allowed for hosted products', () => {
    expect(validateProductButton({ type: 'buy', plan: 1 }, external)).toMatch(/hosted/)
  })

  it('buy requires a plan', () => {
    expect(validateProductButton({ type: 'buy' }, hosted)).toMatch(/plan/)
    expect(validateProductButton({ type: 'buy', plan: null }, hosted)).toMatch(/plan/)
    expect(validateProductButton({ type: 'buy', plan: 3 }, hosted)).toBe(true)
    expect(validateProductButton({ type: 'buy', plan: { id: 3 } }, hosted)).toBe(true)
  })

  it.each(['download', 'demo', 'contact'] as const)('%s has no product preconditions', (type) => {
    expect(validateProductButton({ type }, hosted)).toBe(true)
    expect(validateProductButton({ type }, external)).toBe(true)
  })
})
