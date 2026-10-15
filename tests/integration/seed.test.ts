import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

import { seed } from '../../scripts/seed/seed'

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
})
