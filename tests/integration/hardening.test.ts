/** Regression tests from reviews, and the rules they led to. */
import { createHash } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { defaultStackParser } from '@sentry/nextjs'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { scrubEvent } from '@/lib/scrub'
import type { User } from '@/payload-types'
import config from '@/payload.config'

let payload: Payload
const run = `h${Date.now()}`
const users = {} as Record<'owner' | 'editor' | 'support', User>
const cleanup: { collection: Parameters<Payload['delete']>[0]['collection']; id: number }[] = []
const as = (role: keyof typeof users) => ({
  user: { ...users[role], collection: 'users' as const },
  overrideAccess: false,
})
const file = (name: string, data: Buffer, mimetype: string) => ({
  name,
  data,
  mimetype,
  size: data.length,
})
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(510)])

let productId: number

beforeAll(async () => {
  payload = await getPayload({ config })
  for (const role of ['owner', 'editor', 'support'] as const) {
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password: `pw-${run}-${role}`, roles: [role] },
    })
  }
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Hardening',
      slug: `${run}-p`,
      tagline: 'English tagline',
      type: 'desktop',
      category: 'other',
      status: 'live',
      hostingMode: 'hosted',
      accentColor: '#123456',
      primaryButton: { type: 'contact' },
      hiStatus: 'missing',
      layout: [{ blockType: 'featureGrid', items: [{ title: 'English only' }] }],
      _status: 'published',
    },
  })
  productId = product.id
  cleanup.push({ collection: 'products', id: product.id })
})

afterAll(async () => {
  for (const { collection, id } of cleanup.reverse()) {
    await payload.delete({ collection, id }).catch(() => undefined)
  }
  for (const user of Object.values(users))
    await payload.delete({ collection: 'users', id: user.id })
})

describe('installers', () => {
  it('never replaces an installer file through the API and keeps released ones', async () => {
    const installer = await payload.create({
      collection: 'installers',
      data: { product: productId, version: '1.0.0' },
      file: file(`${run}-a.exe`, exe, 'application/x-msdownload'),
    })
    cleanup.push({ collection: 'installers', id: installer.id })
    const other = Buffer.concat([exe, Buffer.from('changed')])
    for (const role of ['editor', 'owner'] as const) {
      await expect(
        payload.update({
          collection: 'installers',
          id: installer.id,
          data: {},
          file: file(`${run}-b.exe`, other, 'application/x-msdownload'),
          ...as(role),
        }),
      ).rejects.toMatchObject({ status: 400 })
    }
    const kept = await payload.findByID({ collection: 'installers', id: installer.id, depth: 0 })
    expect(kept.sha256).toBe(createHash('sha256').update(exe).digest('hex'))

    const release = await payload.create({
      collection: 'releases',
      draft: true,
      data: { product: productId, version: '1.0.0', installer: installer.id },
    })
    cleanup.push({ collection: 'releases', id: release.id })
    await expect(
      payload.delete({ collection: 'installers', id: installer.id }),
    ).rejects.toMatchObject({
      status: 409,
    })
  })
})

describe('installer facts', () => {
  it('ignores API edits to an installer file size', async () => {
    const installer = await payload.create({
      collection: 'installers',
      data: { product: productId, version: '1.0.1' },
      file: file(`${run}-size.exe`, exe, 'application/x-msdownload'),
    })
    cleanup.push({ collection: 'installers', id: installer.id })
    const updated = await payload.update({
      collection: 'installers',
      id: installer.id,
      data: { filesize: 1 },
      ...as('editor'),
    })
    expect(updated.filesize).toBe(exe.length)
  })
})

describe('records and accounts', () => {
  it('ignores staff edits to what a visitor submitted and consented to', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: { type: 'waitlist', email: `${run}@lead.test`, status: 'new' },
    })
    cleanup.push({ collection: 'leads', id: lead.id })
    const edited = await payload.update({
      collection: 'leads',
      id: lead.id,
      data: { email: 'someone@else.test', marketingConsent: { given: true }, status: 'contacted' },
      ...as('support'),
    })
    expect(edited).toMatchObject({ email: `${run}@lead.test`, status: 'contacted' })
    expect(edited.marketingConsent?.given).not.toBe(true)
  })

  it('lets only the owner unlock accounts', async () => {
    await expect(
      payload.unlock({
        collection: 'users',
        // Unlock only reads the email; the Local API type also asks for a password.
        data: { email: users.owner.email, password: '' },
        ...as('editor'),
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('keeps consent-less testimonials unpublished even with an explicit null', async () => {
    const t = await payload.create({
      collection: 'testimonials',
      data: { quote: 'Great', name: 'A', consentReceived: true, _status: 'published' },
    })
    cleanup.push({ collection: 'testimonials', id: t.id })
    await expect(
      payload.update({
        collection: 'testimonials',
        id: t.id,
        data: { consentReceived: null, _status: 'published' },
        ...as('editor'),
      }),
    ).rejects.toThrow(/consent/i)
  })

  it('does not let restoring an old version re-grant withdrawn consent', async () => {
    const t = await payload.create({
      collection: 'testimonials',
      data: { quote: 'Consented', name: 'C', consentReceived: true, _status: 'published' },
    })
    cleanup.push({ collection: 'testimonials', id: t.id })
    const { docs } = await payload.findVersions({
      collection: 'testimonials',
      where: { parent: { equals: t.id } },
      depth: 0,
    })
    await payload.update({
      collection: 'testimonials',
      id: t.id,
      data: { consentReceived: false, _status: 'draft' },
    })
    await expect(
      payload.restoreVersion({ collection: 'testimonials', id: String(docs[0]!.id) }),
    ).rejects.toThrow(/consent/i)
  })

  it('requires an effective date before a legal page is published', async () => {
    await expect(
      payload.create({
        collection: 'legal-pages',
        // effectiveDate is deliberately missing.
        data: {
          title: 'Terms',
          slug: `${run}-terms`,
          version: '1.0',
          hiStatus: 'missing',
          _status: 'published',
        } as RequiredDataFromCollectionSlug<'legal-pages'>,
        ...as('owner'),
      }),
    ).rejects.toThrow(/effective date/i)
  })
})

describe('Sentry', () => {
  it("keeps a real database error's bound values out of the event", async () => {
    const [email, name, time] = ['jane@example.com', 'Bharat Kumar', '2026-11-01T18:24:22.917Z']
    const { drizzle } = payload.db as unknown as { drizzle: { execute(q: unknown): Promise<void> } }
    const error = (await drizzle
      .execute(sql`select ${email}::text, ${name}::text, ${time}::integer`)
      .catch((e: unknown) => e)) as (Error & { cause: Error }) | undefined
    // Sentry sends the error and its cause; both quote a value before scrubbing. A stack starts
    // with the message, and the SDK's parser reads a frame from the line of values.
    expect(error?.message).toContain(name)
    expect(error?.cause.message).toContain(time)
    expect(JSON.stringify(defaultStackParser(error?.stack ?? '', 1))).toContain('Kumar')
    const values = [error!.cause, error!].map((e) => ({
      type: e.name,
      value: e.message,
      stacktrace: { frames: defaultStackParser(e.stack ?? '', 1) },
    }))
    const event = scrubEvent({ type: undefined, exception: { values } })
    for (const value of ['jane', 'Kumar', '2026-11-01']) {
      expect(JSON.stringify(event)).not.toContain(value)
    }
    expect(event.exception?.values?.[0]?.value).toBe(
      'invalid input syntax for type integer: [Filtered]',
    )
    expect(event.exception?.values?.[1]?.value).toBe('Failed query: [Filtered]')
    expect(event.exception?.values?.[1]?.stacktrace?.frames?.length).toBeGreaterThan(0)
  })
})

describe('media', () => {
  it('accepts captions as text/vtt and rejects other text files', async () => {
    const vtt = await payload.create({
      collection: 'media',
      data: { alt: 'Captions' },
      file: file(`${run}.vtt`, Buffer.from('WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n'), 'text/vtt'),
    })
    cleanup.push({ collection: 'media', id: vtt.id })
    expect(vtt.mimeType).toBe('text/vtt')
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'Script' },
        file: file(`${run}.bat`, Buffer.from('@echo off'), 'text/plain'),
      }),
    ).rejects.toThrow()
  })

  it('rejects SVG content under an image extension', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>')
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'Renamed SVG' },
        file: file(`${run}-logo.png`, svg, 'image/png'),
      }),
    ).rejects.toThrow()
  })
})

describe('partial Hindi (spec §6)', () => {
  it('still requires the fields when a document is created from the Hindi admin', async () => {
    await expect(
      payload.create({
        collection: 'faqs',
        locale: 'hi',
        data: { category: 'general' } as never,
        ...as('editor'),
      }),
    ).rejects.toThrow(/question|answer/i)
  })

  it('saves a partly translated plan and still requires English', async () => {
    const plan = await payload.create({
      collection: 'plans',
      data: {
        product: productId,
        code: `${run}-pro`,
        name: 'Pro',
        billing: 'one_time',
        active: false,
        features: [{ text: 'One' }, { text: 'Two' }],
      },
    })
    cleanup.push({ collection: 'plans', id: plan.id })
    await payload.update({
      collection: 'plans',
      id: plan.id,
      locale: 'hi',
      data: { name: 'प्रो' },
      ...as('editor'),
    })
    const hi = await payload.findByID({
      collection: 'plans',
      id: plan.id,
      locale: 'hi',
      fallbackLocale: false,
      depth: 0,
    })
    expect(hi.name).toBe('प्रो')
    expect(hi.features?.map((f) => f.text ?? null)).toEqual([null, null])

    await expect(
      payload.create({
        collection: 'plans',
        data: { product: productId, code: `${run}-x`, billing: 'one_time', active: false },
        ...as('editor'),
      }),
    ).rejects.toThrow(/name/i)
  })

  it('publishes from the Hindi admin with untranslated block rows', async () => {
    const updated = await payload.update({
      collection: 'products',
      id: productId,
      locale: 'hi',
      data: { tagline: 'हिंदी टैगलाइन', _status: 'published' },
      ...as('editor'),
    })
    expect(updated._status).toBe('published')
  })
})

describe('audit log', () => {
  it('keeps personal data out and records real publishing transitions', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: { type: 'contact', email: `${run}-pii@lead.test`, status: 'new' },
    })
    cleanup.push({ collection: 'leads', id: lead.id })
    const leadLog = await payload.find({
      collection: 'audit-log',
      where: { and: [{ entity: { equals: 'leads' } }, { docId: { equals: String(lead.id) } }] },
      depth: 0,
    })
    expect(leadLog.docs[0]?.summary).not.toContain('@')

    const t = await payload.create({
      collection: 'testimonials',
      data: { quote: 'Q', name: `Person ${run}`, consentReceived: true },
      draft: true,
    })
    cleanup.push({ collection: 'testimonials', id: t.id })
    const tLog = await payload.find({
      collection: 'audit-log',
      where: { and: [{ entity: { equals: 'testimonials' } }, { docId: { equals: String(t.id) } }] },
      depth: 0,
    })
    expect(tLog.docs[0]?.summary).not.toContain(`Person ${run}`)

    await payload.update({
      collection: 'products',
      id: productId,
      draft: true,
      data: { tagline: 'Draft' },
      ...as('editor'),
    })
    await payload.update({
      collection: 'products',
      id: productId,
      data: { _status: 'draft' },
      ...as('editor'),
    })
    const log = await payload.find({
      collection: 'audit-log',
      where: {
        and: [{ entity: { equals: 'products' } }, { docId: { equals: String(productId) } }],
      },
      sort: '-createdAt',
      limit: 2,
      depth: 0,
    })
    expect(log.docs.map((d) => d.summary?.match(/\[.*\]$/)?.[0])).toEqual([
      '[published → draft]',
      '[draft saved]',
    ])
    expect(log.docs[0]?.actorEmail).toBe(users.editor.email)
  })
})
