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

describe('legal pages with blanks', () => {
  const body = (text: string) => ({
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
          ],
        },
      ],
    },
  })
  let serial = 0
  /** A draft as the Owner would find it in the admin, with its Hindi if it has any yet. */
  const draftPage = async (en: string, hi?: string) => {
    const slug = `${run}-legal-${++serial}`
    const page = await payload.create({
      collection: 'legal-pages',
      locale: 'en',
      draft: true,
      data: {
        title: `Page ${slug}`,
        slug,
        body: body(en),
        version: '1.0',
        effectiveDate: '2026-11-01T00:00:00.000Z',
        hiStatus: 'draft',
        _status: 'draft',
      },
      ...as('owner'),
    })
    cleanup.push({ collection: 'legal-pages', id: page.id })
    if (hi) {
      await payload.update({
        collection: 'legal-pages',
        id: page.id,
        locale: 'hi',
        draft: true,
        data: { title: `पेज ${slug}`, body: body(hi) },
        ...as('owner'),
      })
    }
    return page.id
  }
  const publish = (id: number, locale: 'en' | 'hi' = 'en') =>
    payload.update({
      collection: 'legal-pages',
      id,
      locale,
      data: { _status: 'published' },
      ...as('owner'),
    })
  /** What a visitor would be served: nothing while the page was never published. */
  const live = async (id: number, locale?: 'en' | 'hi') =>
    (
      await payload.find({
        collection: 'legal-pages',
        where: { id: { equals: id } },
        depth: 0,
        locale,
        overrideAccess: false,
      })
    ).docs[0]

  const refused = async (attempt: Promise<unknown>, expected: string) => {
    const error = (await attempt.then(
      () => null,
      (e: unknown) => e,
    )) as (Error & { data?: { errors?: { path: string; message: string }[] } }) | null
    expect(error?.data?.errors?.[0]?.path).toBe('body')
    expect(error?.data?.errors?.[0]?.message).toContain(expected)
    // A production build returns only the error's own message.
    expect(error?.message).toContain(expected)
  }

  it('refuses to publish with a blank in English, whichever language the Owner is in', async () => {
    const id = await draftPage('CIN: {{CIN}}', 'पूरा पाठ')
    await refused(publish(id), 'English: {{CIN}}')
    await refused(publish(id, 'hi'), 'English: {{CIN}}')
    expect(await live(id)).toBeUndefined()
  })

  it('refuses to publish with a blank only in Hindi, whichever language the Owner is in', async () => {
    const id = await draftPage('Full text', 'समय: {{BUSINESS_DAYS}}')
    await refused(publish(id), 'Hindi: {{BUSINESS_DAYS}}')
    await refused(publish(id, 'hi'), 'Hindi: {{BUSINESS_DAYS}}')
    expect(await live(id)).toBeUndefined()
  })

  it('refuses to publish in one language, which writes text the check does not read', async () => {
    // A draft save leaves the live row as the first save wrote it, blank included.
    const id = await draftPage('CIN: {{CIN}}')
    await payload.update({
      collection: 'legal-pages',
      id,
      locale: 'en',
      draft: true,
      data: { body: body('CIN: filled in') },
      ...as('owner'),
    })
    await refused(
      payload.update({
        collection: 'legal-pages',
        id,
        locale: 'hi',
        publishSpecificLocale: 'hi',
        data: { _status: 'published' },
        ...as('owner'),
      }),
      'both languages',
    )
    expect(await live(id)).toBeUndefined()

    await publish(id)
    expect(JSON.stringify(await live(id))).toContain('CIN: filled in')
    await refused(
      payload.update({
        collection: 'legal-pages',
        id,
        locale: 'en',
        publishSpecificLocale: 'en',
        data: { _status: 'published' },
        ...as('owner'),
      }),
      'both languages',
    )
  })

  it('names what is left in each language', async () => {
    const id = await draftPage('{{CIN}} {{CIN}} {{HOST}}', '{{CIN}}')
    await refused(publish(id), 'English: {{CIN}} {{HOST}}. Hindi: {{CIN}}.')
  })

  it('checks the text being saved, not only the stored draft', async () => {
    const id = await draftPage('Full text', 'पूरा पाठ')
    const saving = (locale: 'en' | 'hi', text: string) =>
      payload.update({
        collection: 'legal-pages',
        id,
        locale,
        data: { body: body(text), _status: 'published' },
        ...as('owner'),
      })
    await refused(saving('hi', 'समय: {{BUSINESS_DAYS}}'), 'Hindi: {{BUSINESS_DAYS}}')
    expect(await live(id)).toBeUndefined()

    // A blank the same save fills no longer counts.
    const fixed = await draftPage('CIN: {{CIN}}', 'पूरा पाठ')
    const page = await payload.update({
      collection: 'legal-pages',
      id: fixed,
      locale: 'en',
      data: { body: body('CIN: filled in'), _status: 'published' },
      ...as('owner'),
    })
    expect(page._status).toBe('published')
  })

  // Payload accepts locale=all, though its generated type lists only real locales. On an update it
  // ignores the text sent and keeps what is stored, so the stored text is what counts.
  const allLocales = 'all' as never
  it('checks what is stored when a save names every language', async () => {
    const clean = { en: body('Full text'), hi: body('पूरा पाठ') }
    const blank = await draftPage('Full text', 'समय: {{BUSINESS_DAYS}}')
    await refused(
      payload.update({
        collection: 'legal-pages',
        id: blank,
        locale: allLocales,
        data: { body: clean, _status: 'published' } as never,
        ...as('owner'),
      }),
      'Hindi: {{BUSINESS_DAYS}}',
    )
    expect(await live(blank)).toBeUndefined()

    const id = await draftPage('Full text', 'पूरा पाठ')
    await payload.update({
      collection: 'legal-pages',
      id,
      locale: allLocales,
      data: {
        body: { en: body('{{NEVER_WRITTEN}}'), hi: body('{{NEVER_WRITTEN}}') },
        _status: 'published',
      } as never,
      ...as('owner'),
    })
    expect(
      JSON.stringify(
        await payload.findByID({
          collection: 'legal-pages',
          id,
          locale: allLocales,
          depth: 0,
          overrideAccess: true,
        }),
      ),
    ).not.toContain('{{')
  })

  it('refuses a copy published with a blank in the language it was not made from', async () => {
    const id = await draftPage('Full text', 'समय: {{BUSINESS_DAYS}}')
    await refused(
      payload.duplicate({
        collection: 'legal-pages',
        id,
        locale: 'en',
        draft: false,
        data: { _status: 'published' },
        ...as('owner'),
      }),
      'Hindi: {{BUSINESS_DAYS}}',
    )
  })

  it('checks what the page would print beside its text', async () => {
    const id = await draftPage('Full text', 'पूरा पाठ')
    const saving = (data: { version: string } | { slug: string }) =>
      payload.update({
        collection: 'legal-pages',
        id,
        locale: 'en',
        data: { ...data, _status: 'published' },
        ...as('owner'),
      })
    await refused(saving({ version: '{{VERSION}}' }), 'English: {{VERSION}}')
    await refused(saving({ slug: '{{SLUG}}' }), 'Hindi: {{SLUG}}')
    expect(await live(id)).toBeUndefined()
  })

  it('sees a blank that formatting split across two text nodes', async () => {
    const id = await draftPage('Full text', 'पूरा पाठ')
    const split = body('CIN: {')
    split.root.children[0]!.children.push({
      ...split.root.children[0]!.children[0]!,
      text: '{CIN}}',
      format: 1,
    })
    await refused(
      payload.update({
        collection: 'legal-pages',
        id,
        locale: 'en',
        data: { body: split, _status: 'published' },
        ...as('owner'),
      }),
      'English: {{CIN}}',
    )
  })

  it('checks the title as well as the body', async () => {
    const id = await draftPage('Full text', 'पूरा पाठ')
    await refused(
      payload.update({
        collection: 'legal-pages',
        id,
        locale: 'hi',
        data: { title: '{{TITLE}}', _status: 'published' },
        ...as('owner'),
      }),
      'Hindi: {{TITLE}}',
    )
  })

  it('refuses a page created as published', async () => {
    await refused(
      payload.create({
        collection: 'legal-pages',
        data: {
          title: 'Blank',
          slug: `${run}-legal-created`,
          body: body('{{CIN}}'),
          version: '1.0',
          effectiveDate: '2026-11-01T00:00:00.000Z',
          hiStatus: 'missing',
          _status: 'published',
        },
        ...as('owner'),
      }),
      'English: {{CIN}}',
    )
  })

  it('refuses a page created in every language with a blank only in Hindi', async () => {
    await refused(
      payload.create({
        collection: 'legal-pages',
        locale: allLocales,
        data: {
          title: { en: 'Blank', hi: 'Blank' },
          slug: `${run}-legal-all`,
          body: { en: body('Full text'), hi: body('समय: {{BUSINESS_DAYS}}') },
          version: '1.0',
          effectiveDate: '2026-11-01T00:00:00.000Z',
          hiStatus: 'draft',
          _status: 'published',
        } as never,
        ...as('owner'),
      }),
      'Hindi: {{BUSINESS_DAYS}}',
    )
  })

  it('leaves the page a draft when a bulk publish reaches it', async () => {
    const id = await draftPage('Full text', 'समय: {{BUSINESS_DAYS}}')
    const { errors } = await payload.update({
      collection: 'legal-pages',
      where: { id: { equals: id } },
      draft: true,
      data: { _status: 'published' },
      ...as('owner'),
    })
    expect(errors).toHaveLength(1)
    expect(await live(id)).toBeUndefined()
  })

  it('checks the live row when a bulk write has no draft flag, because that is what it writes', async () => {
    // The seed's path: created with a blank, filled in later by draft saves.
    const filled = await draftPage('CIN: {{CIN}}', 'पूरा पाठ')
    await payload.update({
      collection: 'legal-pages',
      id: filled,
      locale: 'en',
      draft: true,
      data: { body: body('CIN: filled in') },
      ...as('owner'),
    })
    const bulk = (id: number, data: { _status: 'published' } | { version: string }) =>
      payload.update({
        collection: 'legal-pages',
        where: { id: { equals: id } },
        locale: 'hi',
        data,
        ...as('owner'),
      })
    expect((await bulk(filled, { _status: 'published' })).errors).toHaveLength(1)
    expect(await live(filled)).toBeUndefined()

    // A draft's blank doesn't stop a write that leaves the draft out.
    const id = await draftPage('Full text', 'पूरा पाठ')
    await publish(id)
    await payload.update({
      collection: 'legal-pages',
      id,
      locale: 'hi',
      draft: true,
      data: { body: body('समय: {{BUSINESS_DAYS}}') },
      ...as('owner'),
    })
    expect((await bulk(id, { version: '1.1' })).errors).toHaveLength(0)
    expect(JSON.stringify(await live(id, 'hi'))).not.toContain('{{')
  })

  it('still saves drafts with blanks, and keeps a live page live meanwhile', async () => {
    const id = await draftPage('Full text', 'पूरा पाठ')
    await publish(id)

    // Writing to a published page without the draft flag changes the live row, so it counts.
    const clause = body('New clause: {{CONFIRM_WITH_LAWYER}}')
    await refused(
      payload.update({
        collection: 'legal-pages',
        id,
        locale: 'en',
        data: { body: clause },
        ...as('owner'),
      }),
      'English: {{CONFIRM_WITH_LAWYER}}',
    )

    const saved = await payload.update({
      collection: 'legal-pages',
      id,
      locale: 'en',
      draft: true,
      data: { body: clause },
      ...as('owner'),
    })
    expect(saved._status).toBe('draft')
    expect(JSON.stringify((await live(id))?.body)).toContain('Full text')

    // The same write on top of that draft takes the page offline: its text still never shows.
    await payload.update({
      collection: 'legal-pages',
      id,
      locale: 'en',
      data: { version: '1.1' },
      ...as('owner'),
    })
    expect(JSON.stringify((await live(id)) ?? {})).not.toContain('{{')
  })

  describe('restoring a version', () => {
    const publishedVersion = async (id: number) => {
      const { docs } = await payload.findVersions({
        collection: 'legal-pages',
        where: { parent: { equals: id }, 'version._status': { equals: 'published' } },
        sort: '-updatedAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      return String(docs[0]!.id)
    }

    it('goes by the version, even while the latest draft has a blank', async () => {
      const id = await draftPage('Full text', 'पूरा पाठ')
      await publish(id)
      await payload.update({
        collection: 'legal-pages',
        id,
        locale: 'hi',
        draft: true,
        data: { body: body('समय: {{BUSINESS_DAYS}}') },
        ...as('owner'),
      })
      const restored = await payload.restoreVersion({
        collection: 'legal-pages',
        id: await publishedVersion(id),
        locale: allLocales,
        depth: 0,
        overrideAccess: true,
      })
      expect(restored._status).toBe('published')
      expect(JSON.stringify(restored)).toContain('पूरा पाठ')
      expect(JSON.stringify(restored)).not.toContain('{{')
    })

    it('refuses a published version that holds a blank', async () => {
      const id = await draftPage('Full text', 'समय: {{BUSINESS_DAYS}}')
      await payload.update({
        collection: 'legal-pages',
        id,
        data: { _status: 'published' },
        overrideAccess: true,
        context: { allowPlaceholders: true },
      })
      const version = await publishedVersion(id)
      await refused(
        payload.restoreVersion({
          collection: 'legal-pages',
          id: version,
          depth: 0,
          overrideAccess: true,
        }),
        'Hindi: {{BUSINESS_DAYS}}',
      )
    })
  })

  it('lets a blank through with the flag only seed:publish sets', async () => {
    const id = await draftPage('CIN: {{CIN}}', 'पूरा पाठ')
    const page = await payload.update({
      collection: 'legal-pages',
      id,
      data: { _status: 'published' },
      depth: 0,
      overrideAccess: true,
      context: { allowPlaceholders: true },
    })
    expect(page._status).toBe('published')
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
