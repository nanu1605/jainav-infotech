/**
 * Revalidation follows what is actually live (spec §4.3): draft saves change nothing public, and
 * publish, slug changes and unpublish expire both locales' pages, including the old URL.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }))

let payload: Payload
let id: number
const run = `rv${Date.now()}`
const paths = () => revalidatePath.mock.calls.map(([path]) => path as string)

beforeAll(async () => {
  payload = await getPayload({ config })
})
beforeEach(() => vi.clearAllMocks())
afterAll(async () => {
  if (id) await payload.delete({ collection: 'products', id })
})

describe('product revalidation', () => {
  it('ignores draft saves and expires both locales on publish', async () => {
    const draft = await payload.create({
      collection: 'products',
      draft: true,
      data: {
        name: 'Revalidation',
        slug: `${run}-a`,
        tagline: 'Tagline',
        type: 'saas',
        category: 'other',
        status: 'live',
        hostingMode: 'external',
        accentColor: '#123456',
        primaryButton: { type: 'contact' },
        hiStatus: 'missing',
      },
    })
    id = draft.id
    expect(revalidatePath).not.toHaveBeenCalled()

    await payload.update({ collection: 'products', id, data: { _status: 'published' } })
    expect(paths()).toEqual(
      expect.arrayContaining([`/en/products/${run}-a`, `/hi/products/${run}-a`]),
    )
    expect(revalidateTag).toHaveBeenCalledWith('products', { expire: 0 })
  })

  it('expires the old URL when a slug change saved as a draft is published', async () => {
    await payload.update({ collection: 'products', id, draft: true, data: { slug: `${run}-b` } })
    expect(revalidatePath).not.toHaveBeenCalled()

    await payload.update({ collection: 'products', id, data: { _status: 'published' } })
    expect(paths()).toEqual(
      expect.arrayContaining([
        `/en/products/${run}-a`,
        `/hi/products/${run}-a`,
        `/en/products/${run}-b`,
        `/hi/products/${run}-b`,
      ]),
    )
  })

  it('expires the live page when it is unpublished after a draft save', async () => {
    await payload.update({ collection: 'products', id, draft: true, data: { tagline: 'Pending' } })
    expect(revalidatePath).not.toHaveBeenCalled()

    // The admin's Unpublish sends `_status: 'draft'` without the draft flag.
    await payload.update({ collection: 'products', id, data: { _status: 'draft' } })
    expect(paths()).toEqual(
      expect.arrayContaining([`/en/products/${run}-b`, `/hi/products/${run}-b`]),
    )
  })

  it('treats bulk "Publish many" (draft flag plus published status) as a publish', async () => {
    await payload.update({ collection: 'products', id, draft: true, data: { slug: `${run}-c` } })
    expect(revalidatePath).not.toHaveBeenCalled()

    await payload.update({
      collection: 'products',
      where: { id: { equals: id } },
      draft: true,
      data: { _status: 'published' },
    })
    expect(paths()).toEqual(
      expect.arrayContaining([`/en/products/${run}-c`, `/hi/products/${run}-c`]),
    )
  })
})
