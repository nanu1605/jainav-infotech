import { editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

import { legalPages } from '../../scripts/seed/content'
import { legalBody, seed } from '../../scripts/seed/seed'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('seed', () => {
  it('runs twice safely and keeps English and Hindi values apart', async () => {
    await seed(payload)
    const counts = async () =>
      Promise.all(
        (['products', 'plans', 'services', 'pages', 'faqs', 'legal-pages', 'team'] as const).map(
          async (collection) => (await payload.count({ collection })).totalDocs,
        ),
      )
    const before = await counts()

    const second = await seed(payload)
    expect(second.created).toEqual([])
    expect(await counts()).toEqual(before)

    const find = (locale: 'en' | 'hi') =>
      payload.find({
        collection: 'products',
        where: { slug: { equals: 'vyro' } },
        draft: true,
        locale,
        fallbackLocale: false,
        depth: 0,
      })
    const [en, hi] = [(await find('en')).docs[0], (await find('hi')).docs[0]]
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
    expect(en?.secondaryButton).toMatchObject({ type: 'buy' })
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
