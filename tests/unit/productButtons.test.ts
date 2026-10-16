import { describe, expect, it } from 'vitest'

import { resolveProductButton } from '@/lib/productButtons'

const vyro = { slug: 'vyro', status: 'live', hostingMode: 'hosted', externalUrl: null } as const
const menumesh = {
  slug: 'menumesh',
  status: 'live',
  hostingMode: 'external',
  externalUrl: 'https://menumesh.example',
} as const
const release = { version: '1.2.0', sizeBytes: 12_000_000 }
const ctx = { releases: { stable: release, beta: null }, storeEnabled: false, schedulerUrl: null }

describe('resolveProductButton (spec §8.5)', () => {
  it('coming soon overrides every button with the waitlist', () => {
    const soon = { ...menumesh, status: 'coming-soon' } as const
    for (const type of ['visit', 'download', 'buy', 'demo', 'contact'] as const) {
      expect(resolveProductButton({ type }, soon, ctx)).toMatchObject({
        kind: 'waitlist',
        href: '/products/menumesh#waitlist',
      })
    }
    expect(resolveProductButton(null, soon, ctx)?.kind).toBe('waitlist')
  })

  it('no button configured shows nothing', () => {
    expect(resolveProductButton(null, vyro, ctx)).toBeNull()
    expect(resolveProductButton({ type: null }, vyro, ctx)).toBeNull()
  })

  it('visit goes through the tracked /go/ redirect in a new tab', () => {
    expect(resolveProductButton({ type: 'visit' }, menumesh, ctx)).toEqual({
      kind: 'visit',
      label: null,
      href: '/go/menumesh',
      external: true,
    })
    expect(resolveProductButton({ type: 'visit' }, vyro, ctx)).toBeNull()
  })

  it('download needs a published release on its channel, else the waitlist', () => {
    expect(resolveProductButton({ type: 'download' }, vyro, ctx)).toMatchObject({
      kind: 'download',
      href: '/api/v1/downloads/vyro/latest?channel=stable',
      version: '1.2.0',
      sizeBytes: 12_000_000,
    })
    expect(resolveProductButton({ type: 'download', channel: 'beta' }, vyro, ctx)?.kind).toBe(
      'waitlist',
    )
  })

  it('buy links to the plan on the pricing page, disabled until the store opens', () => {
    const plan = { name: 'Pro', code: 'pro' }
    expect(resolveProductButton({ type: 'buy', plan }, vyro, ctx)).toEqual({
      kind: 'buy',
      label: null,
      href: '/products/vyro/pricing#plan-pro',
      plan: 'Pro',
      disabled: true,
    })
    expect(
      resolveProductButton({ type: 'buy', plan }, vyro, { ...ctx, storeEnabled: true }),
    ).toMatchObject({ disabled: false })
    expect(resolveProductButton({ type: 'buy', plan }, menumesh, ctx)).toBeNull()
  })

  it('demo uses the button URL, then the scheduler, then falls back to contact', () => {
    const own = resolveProductButton({ type: 'demo', url: 'https://cal.com/x' }, menumesh, {
      ...ctx,
      schedulerUrl: 'https://cal.com/default',
    })
    expect(own).toMatchObject({ kind: 'demo', href: 'https://cal.com/x' })
    expect(
      resolveProductButton({ type: 'demo' }, menumesh, {
        ...ctx,
        schedulerUrl: 'https://cal.com/d',
      }),
    ).toMatchObject({ kind: 'demo', href: 'https://cal.com/d' })
    expect(resolveProductButton({ type: 'demo' }, menumesh, ctx)).toMatchObject({
      kind: 'contact',
      href: '/contact?product=menumesh',
    })
  })

  it('contact preselects the product; label overrides pass through', () => {
    expect(resolveProductButton({ type: 'contact', labelOverride: 'Ask us' }, vyro, ctx)).toEqual({
      kind: 'contact',
      label: 'Ask us',
      href: '/contact?product=vyro',
    })
  })
})
