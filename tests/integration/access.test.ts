/**
 * Phase 1 "done when" (spec §20): roles, owner-only publishing, anonymous access and the audit log.
 * Calls use the Local API with `overrideAccess: false`, which applies the same access rules as REST.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'

let payload: Payload
const run = `t${Date.now()}`
const users: Record<'owner' | 'editor' | 'support', User> = {} as never
const cleanup: {
  collection: 'products' | 'legal-pages' | 'releases' | 'leads' | 'testimonials' | 'installers'
  id: number
}[] = []

const as = (role: keyof typeof users) => ({
  user: { ...users[role], collection: 'users' as const },
  overrideAccess: false,
})
const anonymous = { overrideAccess: false } as const
const forbidden = { status: 403 }

const productData = (slug: string) => ({
  name: 'Test product',
  slug,
  tagline: 'English tagline',
  type: 'saas' as const,
  category: 'other' as const,
  status: 'live' as const,
  hostingMode: 'external' as const,
  accentColor: '#123456',
  primaryButton: { type: 'contact' as const },
  hiStatus: 'missing' as const,
})

beforeAll(async () => {
  payload = await getPayload({ config })
  for (const role of ['owner', 'editor', 'support'] as const) {
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password: `pw-${run}-${role}`, roles: [role] },
    })
  }
})

afterAll(async () => {
  for (const { collection, id } of cleanup.reverse()) {
    await payload.delete({ collection, id }).catch(() => undefined)
  }
  for (const user of Object.values(users))
    await payload.delete({ collection: 'users', id: user.id })
})

describe('content editing', () => {
  it('lets an editor create a product in English and Hindi, save a draft and publish it', async () => {
    const slug = `p-${run}`
    const draft = await payload.create({
      collection: 'products',
      data: productData(slug),
      draft: true,
      locale: 'en',
      ...as('editor'),
    })
    cleanup.push({ collection: 'products', id: draft.id })
    await payload.update({
      collection: 'products',
      id: draft.id,
      data: { tagline: 'हिंदी टैगलाइन' },
      draft: true,
      locale: 'hi',
      ...as('editor'),
    })

    const hidden = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      ...anonymous,
    })
    expect(hidden.docs).toHaveLength(0)

    await payload.update({
      collection: 'products',
      id: draft.id,
      data: { _status: 'published' },
      ...as('editor'),
    })
    const en = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      ...anonymous,
    })
    const hi = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      locale: 'hi',
      fallbackLocale: false,
      ...anonymous,
    })
    expect(en.docs[0]?.tagline).toBe('English tagline')
    expect(hi.docs[0]?.tagline).toBe('हिंदी टैगलाइन')
  })

  it('serves the published version, not a newer draft, to anonymous readers', async () => {
    const product = await payload.create({
      collection: 'products',
      data: { ...productData(`v-${run}`), _status: 'published' },
      ...as('editor'),
    })
    cleanup.push({ collection: 'products', id: product.id })
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { tagline: 'Unpublished change' },
      draft: true,
      ...as('editor'),
    })
    const live = await payload.findByID({
      collection: 'products',
      id: product.id,
      draft: true,
      ...anonymous,
    })
    expect(live.tagline).toBe('English tagline')
  })

  it('blocks support from editing content', async () => {
    const product = await payload.create({
      collection: 'products',
      data: { ...productData(`s-${run}`), _status: 'published' },
      ...as('owner'),
    })
    cleanup.push({ collection: 'products', id: product.id })
    await expect(
      payload.update({
        collection: 'products',
        id: product.id,
        data: { tagline: 'x' },
        ...as('support'),
      }),
    ).rejects.toMatchObject(forbidden)
    await expect(
      payload.create({
        collection: 'pages',
        data: { title: 'x', slug: `x-${run}` },
        draft: true,
        ...as('support'),
      }),
    ).rejects.toMatchObject(forbidden)
  })
})

describe('owner-only publishing', () => {
  it('lets editors save legal-page drafts but not publish or unpublish them', async () => {
    const page = await payload.create({
      collection: 'legal-pages',
      data: { title: 'Terms', slug: `terms-${run}`, version: '0.1' },
      draft: true,
      ...as('editor'),
    })
    cleanup.push({ collection: 'legal-pages', id: page.id })

    // Publish, a non-draft save (would write the live row) and a draft save.
    await expect(
      payload.update({
        collection: 'legal-pages',
        id: page.id,
        data: { _status: 'published' },
        ...as('editor'),
      }),
    ).rejects.toMatchObject(forbidden)
    await expect(
      payload.update({
        collection: 'legal-pages',
        id: page.id,
        data: { version: '0.2' },
        ...as('editor'),
      }),
    ).rejects.toMatchObject(forbidden)
    await payload.update({
      collection: 'legal-pages',
      id: page.id,
      data: { version: '0.3' },
      draft: true,
      ...as('editor'),
    })

    await payload.update({
      collection: 'legal-pages',
      id: page.id,
      data: { _status: 'published', effectiveDate: '2026-10-15T00:00:00.000Z' },
      ...as('owner'),
    })
    await expect(
      payload.update({
        collection: 'legal-pages',
        id: page.id,
        data: { _status: 'draft' },
        ...as('editor'),
      }),
    ).rejects.toMatchObject(forbidden)
    await expect(
      payload.delete({ collection: 'legal-pages', id: page.id, ...as('editor') }),
    ).rejects.toMatchObject(forbidden)
  })

  it('lets editors create release drafts but not publish them', async () => {
    const product = await payload.create({
      collection: 'products',
      data: { ...productData(`r-${run}`), hostingMode: 'hosted', _status: 'published' },
      ...as('owner'),
    })
    cleanup.push({ collection: 'products', id: product.id })
    const release = await payload.create({
      collection: 'releases',
      data: {
        product: product.id,
        version: '1.0.0',
        channel: 'stable',
        platform: 'windows-x86_64',
      },
      draft: true,
      ...as('editor'),
    })
    cleanup.push({ collection: 'releases', id: release.id })
    await expect(
      payload.update({
        collection: 'releases',
        id: release.id,
        data: { _status: 'published' },
        ...as('editor'),
      }),
    ).rejects.toMatchObject(forbidden)
    await expect(
      payload.create({
        collection: 'releases',
        data: {
          product: product.id,
          version: '1.0.1',
          channel: 'stable',
          platform: 'windows-x86_64',
          releasedAt: new Date().toISOString(),
          installer: 0, // never reached: access is checked before validation
          updaterSignature: 'sig',
          _status: 'published',
        },
        ...as('editor'),
      }),
    ).rejects.toMatchObject(forbidden)
  })
})

describe('installers', () => {
  it('hashes uploaded installers and rejects other file types', async () => {
    const product = await payload.create({
      collection: 'products',
      data: { ...productData(`i-${run}`), hostingMode: 'hosted', _status: 'published' },
      ...as('owner'),
    })
    cleanup.push({ collection: 'products', id: product.id })
    // A minimal PE header is enough for content sniffing to detect an .exe.
    const data = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(510)])
    const installer = await payload.create({
      collection: 'installers',
      data: { product: product.id, version: '1.0.0' },
      file: {
        data,
        mimetype: 'application/x-msdownload',
        name: `vyro-${run}.exe`,
        size: data.length,
      },
      ...as('editor'),
    })
    cleanup.push({ collection: 'installers', id: installer.id })
    const { createHash } = await import('node:crypto')
    expect(installer.sha256).toBe(createHash('sha256').update(data).digest('hex'))
    expect(installer.filesize).toBe(data.length)

    const text = Buffer.from('not an installer')
    await expect(
      payload.create({
        collection: 'installers',
        data: { product: product.id, version: '1.0.1' },
        file: { data: text, mimetype: 'text/plain', name: `notes-${run}.txt`, size: text.length },
        ...as('editor'),
      }),
    ).rejects.toThrow()
  })
})

describe('private data', () => {
  it('hides leads, data requests, audit log, stats, users and short links from anonymous readers', async () => {
    for (const collection of [
      'leads',
      'data-requests',
      'audit-log',
      'daily-stats',
      'users',
      'short-links',
      'redirects',
    ] as const) {
      await expect(payload.find({ collection, ...anonymous }), collection).rejects.toMatchObject(
        forbidden,
      )
    }
  })

  it('keeps every store collection from anonymous readers and editors (spec §9.3)', async () => {
    const store = [
      'customers',
      'orders',
      'invoices',
      'coupons',
      'otp-challenges',
      'customer-sessions',
      'invoice-counters',
      'webhook-events',
      'payload-jobs',
      'licenses',
      'activations',
      'trials',
    ] as const
    for (const collection of store) {
      await expect(payload.find({ collection, ...anonymous }), collection).rejects.toMatchObject(
        forbidden,
      )
      await expect(payload.find({ collection, ...as('editor') }), collection).rejects.toMatchObject(
        forbidden,
      )
    }
    await expect(
      payload.findGlobal({ slug: 'commerce-settings', ...anonymous }),
    ).rejects.toMatchObject(forbidden)
    // Support reads customers and orders; sign-in plumbing and raw webhooks are the owner's.
    for (const collection of [
      'customers',
      'orders',
      'invoices',
      'licenses',
      'activations',
      'trials',
    ] as const) {
      await expect(payload.find({ collection, ...as('support') })).resolves.toBeTruthy()
    }
    for (const collection of ['otp-challenges', 'customer-sessions', 'webhook-events'] as const) {
      await expect(
        payload.find({ collection, ...as('support') }),
        collection,
      ).rejects.toMatchObject(forbidden)
    }
  })

  it('keeps invoice PDFs from editors, who still read CVs', async () => {
    const files = await payload.find({
      collection: 'private-files',
      where: { purpose: { equals: 'invoice' } },
      ...as('editor'),
    })
    expect(files.totalDocs).toBe(0)
    const access = (await import('@/collections/PrivateFiles')).PrivateFiles.access!.read!
    const read = (role: 'owner' | 'editor' | 'support') =>
      access({ req: { user: { ...users[role], collection: 'users' } } } as never)
    expect(read('owner')).toBe(true)
    expect(read('support')).toBe(true)
    expect(read('editor')).toEqual({ purpose: { not_equals: 'invoice' } })
  })

  it('never lets the API create orders, invoices, activations or trials, even for the owner', async () => {
    for (const collection of ['orders', 'invoices', 'activations', 'trials'] as const) {
      await expect(
        payload.create({ collection, data: {} as never, ...as('owner') }),
        collection,
      ).rejects.toMatchObject(forbidden)
    }
    // Customers and licenses: the Owner only (a complimentary license for someone new).
    for (const collection of ['customers', 'licenses'] as const) {
      for (const role of ['support', 'editor'] as const) {
        await expect(
          payload.create({ collection, data: {} as never, ...as(role) }),
          `${collection} ${role}`,
        ).rejects.toMatchObject(forbidden)
      }
    }
  })

  it('never accepts leads or data requests through the API, even from staff', async () => {
    await expect(
      payload.create({
        collection: 'leads',
        data: { type: 'contact', email: 'a@b.test', status: 'new' },
        ...anonymous,
      }),
    ).rejects.toMatchObject(forbidden)
    await expect(
      payload.create({
        collection: 'leads',
        data: { type: 'contact', email: 'a@b.test', status: 'new' },
        ...as('owner'),
      }),
    ).rejects.toMatchObject(forbidden)
    await expect(
      payload.create({
        collection: 'data-requests',
        data: { type: 'access', email: 'a@b.test', status: 'new' },
        ...as('support'),
      }),
    ).rejects.toMatchObject(forbidden)
  })

  it('lets support work leads that server code created', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: { type: 'contact', email: `Lead-${run}@B.test `, status: 'new' },
    })
    cleanup.push({ collection: 'leads', id: lead.id })
    expect(lead.email).toBe(`lead-${run}@b.test`)
    const updated = await payload.update({
      collection: 'leads',
      id: lead.id,
      data: { status: 'contacted' },
      ...as('support'),
    })
    expect(updated.status).toBe('contacted')
    await expect(
      payload.delete({ collection: 'leads', id: lead.id, ...as('support') }),
    ).rejects.toMatchObject(forbidden)
  })

  it('never exposes a testimonial consent note publicly', async () => {
    const t = await payload.create({
      collection: 'testimonials',
      data: {
        quote: 'Great',
        name: 'A',
        consentReceived: true,
        consentNote: 'Email 2026-10-01',
        _status: 'published',
      },
      ...as('editor'),
    })
    cleanup.push({ collection: 'testimonials', id: t.id })
    const pub = await payload.findByID({ collection: 'testimonials', id: t.id, ...anonymous })
    expect(pub.consentNote).toBeUndefined()
    await expect(
      payload.create({
        collection: 'testimonials',
        data: { quote: 'No consent', name: 'B', _status: 'published' },
        ...as('editor'),
      }),
    ).rejects.toThrow(/consent/i)
  })
})

describe('audit log', () => {
  it('records who changed what', async () => {
    const product = await payload.create({
      collection: 'products',
      data: productData(`a-${run}`),
      draft: true,
      ...as('editor'),
    })
    cleanup.push({ collection: 'products', id: product.id })
    const entries = await payload.find({
      collection: 'audit-log',
      where: {
        and: [{ entity: { equals: 'products' } }, { docId: { equals: String(product.id) } }],
      },
      depth: 0,
    })
    expect(entries.docs[0]).toMatchObject({ action: 'create', actor: users.editor.id })
    await expect(payload.find({ collection: 'audit-log', ...as('editor') })).rejects.toMatchObject(
      forbidden,
    )
  })
})
