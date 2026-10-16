/**
 * The release import's CMS writes (scripts/import-release) against a real database: a draft
 * first, nothing on a re-run, then publishing, checked through the Tauri update feed.
 */
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { NextRequest } from 'next/server'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

import { saveRelease, type ImportInput } from '../../scripts/import-release/release'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const { GET: updates } =
  await import('@/app/api/v1/updates/[product]/[target]/[arch]/[version]/route')

let payload: Payload
let dir: string
let input: ImportInput
const run = `imp${Date.now()}`
const slug = `${run}-app`
const cleanup: { collection: 'products' | 'installers' | 'releases'; id: number }[] = []

const feed = async (version: string) => {
  const params = { product: slug, target: 'windows', arch: 'x86_64', version }
  return updates(
    new NextRequest(`http://localhost:3000/api/v1/updates/${slug}/windows/x86_64/${version}`),
    {
      params: Promise.resolve(params),
    },
  )
}
const count = async (collection: 'installers' | 'releases', product: number) =>
  (await payload.count({ collection, where: { product: { equals: product } } })).totalDocs

beforeAll(async () => {
  payload = await getPayload({ config })
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Import test',
      slug,
      tagline: 'Tagline',
      type: 'desktop',
      category: 'other',
      status: 'live',
      hostingMode: 'external',
      externalUrl: 'https://app.example/',
      accentColor: '#123456',
      primaryButton: { type: 'visit' },
      hiStatus: 'missing',
      _status: 'published',
    },
  })
  cleanup.push({ collection: 'products', id: product.id })

  dir = await mkdtemp(path.join(os.tmpdir(), 'import-test-'))
  const bytes = Buffer.concat([Buffer.from('MZ'), Buffer.from(run), Buffer.alloc(500)])
  const installerPath = path.join(dir, `${run}_0.3.0_x64.exe`)
  await writeFile(installerPath, bytes)
  input = {
    productSlug: slug,
    version: '0.3.0',
    channel: 'stable',
    releasedAt: '2026-10-15T05:18:51Z',
    notes: 'Vyro 0.3.0',
    signature: 'c2lnbmF0dXJl',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    installerPath,
    publish: false,
  }
})

afterAll(async () => {
  for (const { collection, id } of cleanup.reverse()) {
    await payload.delete({ collection, id }).catch(() => undefined)
  }
  await rm(dir, { recursive: true, force: true })
})

describe('saveRelease', () => {
  it('imports a draft the feed does not offer, then changes nothing on a re-run', async () => {
    const first = await saveRelease(payload, input)
    cleanup.push(
      { collection: 'installers', id: first.installerId },
      { collection: 'releases', id: first.releaseId },
    )
    expect(first).toMatchObject({ installer: 'created', release: 'created' })
    const release = await payload.findByID({
      collection: 'releases',
      id: first.releaseId,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
    expect(release).toMatchObject({
      _status: 'draft',
      sha256: input.sha256,
      sizeBytes: 502 + run.length,
    })
    expect((await feed('0.2.0')).status).toBe(204)

    const product = release.product as number
    const again = await saveRelease(payload, input)
    expect(again).toEqual({ ...first, installer: 'existing', release: 'unchanged' })
    expect(await count('installers', product)).toBe(1)
    expect(await count('releases', product)).toBe(1)
  })

  it('publishes on request; the feed then serves it with its signature', async () => {
    expect((await saveRelease(payload, { ...input, publish: true })).release).toBe('published')
    const res = await feed('0.2.0')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      version: '0.3.0',
      notes: 'Vyro 0.3.0',
      pub_date: '2026-10-15T05:18:51.000Z',
      signature: 'c2lnbmF0dXJl',
    })
    expect((await saveRelease(payload, { ...input, publish: true })).release).toBe('unchanged')
  })

  it('refuses to change an imported release', async () => {
    await expect(saveRelease(payload, { ...input, sha256: 'f'.repeat(64) })).rejects.toThrow(
      /different installer or signature/,
    )
    await expect(saveRelease(payload, { ...input, signature: 'b3RoZXI=' })).rejects.toThrow(
      /different installer or signature/,
    )
  })
})
