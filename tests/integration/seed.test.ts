import { editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Product } from '@/payload-types'

import { legalPages } from '../../scripts/seed/content'
import { legalBody, seed } from '../../scripts/seed/seed'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

/** The seeded Clokrix draft in one language, without falling back to English. */
const clokrix = async (locale: 'en' | 'hi') =>
  (
    await payload.find({
      collection: 'products',
      where: { slug: { equals: 'clokrix' } },
      draft: true,
      locale,
      fallbackLocale: false,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]

describe('seed', () => {
  it('runs twice safely and keeps English and Hindi values apart', async () => {
    await seed(payload)
    const counts = async () =>
      Promise.all(
        (
          [
            'products',
            'plans',
            'services',
            'pages',
            'faqs',
            'legal-pages',
            'team',
            'redirects',
          ] as const
        ).map(async (collection) => (await payload.count({ collection })).totalDocs),
      )
    const before = await counts()

    const second = await seed(payload)
    expect(second.created).toEqual([])
    expect(await counts()).toEqual(before)

    const [en, hi] = [await clokrix('en'), await clokrix('hi')]
    expect(en?.tagline).toBe('Know your machine.')
    expect(hi?.tagline).toBe('अपनी मशीन को जानिए।')
    expect(hi?.hiStatus).toBe('draft')
    // Block rows are shared across locales; only their localized leaves differ.
    expect(en?.layout?.[0]?.id).toBe(hi?.layout?.[0]?.id)
    expect(en?.layout?.[0]).toMatchObject({
      blockType: 'productHero',
      heading: 'Know your machine.',
    })
    expect(hi?.layout?.[0]).toMatchObject({
      blockType: 'productHero',
      heading: 'अपनी मशीन को जानिए।',
    })
  })

  it('shows Clokrix as an external product that links to its own site', async () => {
    await seed(payload)
    const [en, hi] = [await clokrix('en'), await clokrix('hi')]
    expect(en).toMatchObject({
      hostingMode: 'external',
      externalUrl: 'https://clokrix.jainavinfotech.in',
      primaryButton: { type: 'visit' },
      secondaryLinks: [
        { kind: 'other', label: 'Buy Pro', url: 'https://clokrix.jainavinfotech.in/buy' },
        { kind: 'other', label: 'Download', url: 'https://clokrix.jainavinfotech.in/download' },
      ],
    })
    expect(hi?.secondaryLinks?.map((link) => link.label)).toEqual(['Pro ख़रीदें', 'डाउनलोड करें'])

    // Display-only tiers; Pro is bought, and Clokrix downloaded, on the Clokrix site.
    const pricing = (doc?: Product) => doc?.layout?.find((block) => block.blockType === 'pricing')
    expect(pricing(en)).toMatchObject({
      source: 'manual',
      fullPricingUrl: 'https://clokrix.jainavinfotech.in/buy',
      tiers: [
        { name: 'Free', price: '₹0' },
        { name: 'Pro', price: '₹10,000', highlight: true },
      ],
    })
    expect(pricing(hi)).toMatchObject({ tiers: [{ name: 'फ़्री' }, { name: 'प्रो' }] })
    expect(en?.layout?.some((block) => block.blockType === 'download')).toBe(false)

    const redirect = async (from: string) =>
      (
        await payload.find({
          collection: 'redirects',
          where: { from: { equals: from } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      ).docs[0]
    for (const from of ['/clokrix', '/products/vyro']) {
      expect(await redirect(from), from).toMatchObject({
        type: '308',
        to: { type: 'reference', reference: { relationTo: 'products', value: en?.id } },
      })
    }
    // A database seeded before the rename keeps its /vyro redirect to the old VYRO product (the
    // seed never overwrites), so only its presence is checked.
    expect(await redirect('/vyro')).toBeDefined()
  })

  it('has every legal page in both languages, with the same structure and placeholders', async () => {
    const editorConfig = await editorConfigFactory.default({ config: payload.config })
    const shape = (json: string) => ({
      headings: json.match(/"type":"heading"/g)?.length,
      placeholders: [...new Set(json.match(/\{\{[A-Z0-9_]+\}\}/g))].sort(),
      links: json.match(/"url":"[^"]*"/g)?.sort(),
    })
    for (const { en: page } of legalPages) {
      const slug = page.slug as string
      const [en, hi] = (['en', 'hi'] as const).map((locale) =>
        JSON.stringify(legalBody(editorConfig, slug, locale)),
      ) as [string, string]
      expect(shape(hi), slug).toEqual(shape(en))
      expect(shape(en).headings, slug).toBeGreaterThan(0)
      // Markdown the converter didn't understand would show up as literal text.
      for (const json of [en, hi]) expect(json, slug).not.toMatch(/\*|\]\(|"text":"#/)
    }
  })
})
