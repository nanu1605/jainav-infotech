/**
 * Phase 3 endpoints against a real database: the Tauri update feed (spec §12.5), counted
 * downloads, /go/ redirects (spec §8.6) and the product → short link sync.
 */
import { NextRequest } from 'next/server'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

const pending: Promise<unknown>[] = []
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  // Run after() work right away and let tests wait for it.
  after: (fn: () => unknown) => void pending.push(Promise.resolve().then(fn)),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const { GET: updates } =
  await import('@/app/api/v1/updates/[product]/[target]/[arch]/[version]/route')
const { GET: latest } = await import('@/app/api/v1/downloads/[product]/latest/route')
const { GET: byId } = await import('@/app/api/v1/downloads/release/[id]/route')
const { GET: go } = await import('@/app/(frontend)/go/[slug]/route')

let payload: Payload
const run = `ep${Date.now()}`
const slug = `${run}-app`
const cleanup: { collection: Parameters<Payload['delete']>[0]['collection']; id: number }[] = []
const ids: Record<string, number> = {}
const exe = (v: string) => Buffer.concat([Buffer.from('MZ'), Buffer.from(v), Buffer.alloc(500)])
const req = (path: string) => new NextRequest(`http://localhost:3000${path}`)

async function release(version: string, channel: 'stable' | 'beta', publish = true) {
  const installer = await payload.create({
    collection: 'installers',
    data: { product: ids.product!, version },
    file: {
      name: `${run}-${version}.exe`,
      data: exe(version),
      mimetype: 'application/x-msdownload',
      size: 512 + version.length,
    },
  })
  cleanup.push({ collection: 'installers', id: installer.id })
  const doc = await payload.create({
    collection: 'releases',
    draft: !publish,
    data: {
      product: ids.product!,
      version,
      channel,
      platform: 'windows-x86_64',
      releasedAt: new Date().toISOString(),
      installer: installer.id,
      updaterSignature: `sig-${version}\n`,
      notes: `Notes for ${version}`,
      ...(publish && { _status: 'published' as const }),
    },
  })
  cleanup.push({ collection: 'releases', id: doc.id })
  ids[version] = doc.id
}

beforeAll(async () => {
  payload = await getPayload({ config })
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Endpoint test',
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
  ids.product = product.id
  cleanup.push({ collection: 'products', id: product.id })
  await release('1.0.0', 'stable')
  await release('1.10.0', 'stable')
  await release('2.0.0-beta.1', 'beta')
  await release('1.11.0', 'stable', false) // a draft: never offered
})

afterAll(async () => {
  await Promise.all(pending)
  for (const { collection, id } of cleanup.reverse()) {
    await payload.delete({ collection, id }).catch(() => undefined)
  }
  const links = await payload.find({ collection: 'short-links', where: { slug: { equals: slug } } })
  for (const link of links.docs) await payload.delete({ collection: 'short-links', id: link.id })
})

const feed = (version: string, query = '', target = 'windows', arch = 'x86_64') =>
  updates(req(`/api/v1/updates/${slug}/${target}/${arch}/${version}${query}`), {
    params: Promise.resolve({ product: slug, target, arch, version }),
  })

describe('Tauri update feed', () => {
  it('offers the newest published higher version with its signature (200)', async () => {
    const res = await feed('1.0.0')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      version: '1.10.0',
      notes: 'Notes for 1.10.0',
      signature: 'sig-1.10.0',
    })
    expect(new Date(body.pub_date).toISOString()).toBe(body.pub_date)
    expect(body.url).toMatch(/^http:\/\/localhost:3000\/.+\.exe$/)
  })

  it('answers 204 when up to date, for drafts, unknown products and other platforms', async () => {
    expect((await feed('1.10.0')).status).toBe(204)
    expect((await feed('1.0.0', '', 'darwin', 'aarch64')).status).toBe(204)
    expect(
      (
        await updates(req('/api/v1/updates/nope/windows/x86_64/1.0.0'), {
          params: Promise.resolve({
            product: 'nope',
            target: 'windows',
            arch: 'x86_64',
            version: '1.0.0',
          }),
        })
      ).status,
    ).toBe(204)
  })

  it('serves the beta channel only on request', async () => {
    expect((await (await feed('1.10.0', '?channel=beta')).json()).version).toBe('2.0.0-beta.1')
    expect((await feed('1.0.0', '?channel=nightly')).status).toBe(400)
  })
})

describe('downloads', () => {
  it('redirects to the newest installer and counts it', async () => {
    const res = await latest(req(`/api/v1/downloads/${slug}/latest`), {
      params: Promise.resolve({ product: slug }),
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain(`${run}-1.10.0.exe`)
    await Promise.all(pending)
    const stats = await payload.find({
      collection: 'daily-stats',
      where: { key: { equals: `${slug}@1.10.0` } },
    })
    expect(Number(stats.docs[0]?.count)).toBe(1)
    cleanup.push({ collection: 'daily-stats', id: stats.docs[0]!.id })
  })

  it('serves a published release by id, never a draft', async () => {
    const ok = await byId(req('/'), { params: Promise.resolve({ id: String(ids['1.0.0']) }) })
    expect(ok.status).toBe(302)
    const draft = await byId(req('/'), { params: Promise.resolve({ id: String(ids['1.11.0']) }) })
    expect(draft.status).toBe(404)
    expect((await byId(req('/'), { params: Promise.resolve({ id: 'abc' }) })).status).toBe(400)
  })
})

describe('/go/ redirects', () => {
  it('the published Visit product keeps a short link, followed with UTM defaults', async () => {
    const res = await go(req(`/go/${slug}`), { params: Promise.resolve({ slug }) })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      `https://app.example/?utm_source=jainav&utm_medium=site&utm_campaign=${slug}`,
    )
  })

  it('404s inactive and unknown links', async () => {
    const link = (
      await payload.find({ collection: 'short-links', where: { slug: { equals: slug } } })
    ).docs[0]!
    await payload.update({ collection: 'short-links', id: link.id, data: { active: false } })
    expect((await go(req('/'), { params: Promise.resolve({ slug }) })).status).toBe(404)
    expect((await go(req('/'), { params: Promise.resolve({ slug: 'NOT valid' }) })).status).toBe(
      404,
    )
  })
})
