/**
 * Phase 4 Leads admin (spec §10, §16): the CSV export, private files (CVs) and their cleanup.
 * Local API calls with `overrideAccess: false` apply the same access rules as REST.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

import { REST_GET, REST_POST } from '@payloadcms/next/routes'
import { createLocalReq, getPayload, type Payload, type PayloadHandler } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { whatsappHref } from '@/components/admin/whatsapp'
import type { Lead, User } from '@/payload-types'
import config from '@/payload.config'

let payload: Payload
let owner: User
let exportLeads: PayloadHandler
const run = `la${Date.now()}`
const leads: Lead[] = []
// Payload checks the %PDF- header and an xref table and %%EOF near the end.
const pdf = Buffer.from(`%PDF-1.4\n% ${run}\n1 0 obj<<>>endobj\nxref\n0 1\ntrailer<<>>\n%%EOF\n`)

const asOwner = () => ({ user: { ...owner, collection: 'users' as const }, overrideAccess: false })

/** The app's /api/[...slug] route handlers, without a running server. */
const rest = (handler: typeof REST_GET, path: string, init?: RequestInit) =>
  handler(config)(new Request(`http://localhost:3000/api${path}`, init), {
    params: Promise.resolve({
      slug: new URL(path, 'http://x').pathname.split('/').filter(Boolean),
    }),
  })

async function exportCsv(query: Record<string, unknown>, user?: User) {
  const req = await createLocalReq(user ? { user: { ...user, collection: 'users' } } : {}, payload)
  req.query = query
  return exportLeads(req)
}

beforeAll(async () => {
  payload = await getPayload({ config })
  owner = await payload.create({
    collection: 'users',
    data: { email: `owner-${run}@jainav.test`, password: `pw-${run}`, roles: ['owner'] },
  })
  const endpoint = payload.collections.leads.config.endpoints
    ? payload.collections.leads.config.endpoints.find((e) => e.path === '/export')
    : undefined
  exportLeads = endpoint!.handler
  for (const data of [
    {
      type: 'contact' as const,
      status: 'new' as const,
      email: `a-${run}@jainav.test`,
      name: '=HYPERLINK("http://evil")',
      phone: '+91 98765 43210',
      message: 'Hello, "team"\nSecond line',
      details: { topic: 'sales', extra: 'x' },
      locale: 'hi' as const,
      marketingConsent: { given: true, at: '2026-10-16T18:35:00.000Z' },
    },
    {
      type: 'newsletter' as const,
      status: 'new' as const,
      email: `b-${run}@jainav.test`,
      name: 'राहुल',
    },
  ]) {
    leads.push(await payload.create({ collection: 'leads', data }))
  }
})

afterAll(async () => {
  for (const lead of leads)
    await payload.delete({ collection: 'leads', id: lead.id }).catch(() => undefined)
  if (owner) await payload.delete({ collection: 'users', id: owner.id })
})

describe('leads CSV export', () => {
  it('is matched before /api/leads/:id', () => {
    // Payload runs the first endpoint whose method and path match.
    const paths = payload.collections.leads.config.endpoints || []
    expect(paths.findIndex((e) => e.path === '/export')).toBeLessThan(
      paths.findIndex((e) => e.path === '/:id' && e.method === 'get'),
    )
  })

  it('answers anonymous REST requests with 403', async () => {
    expect((await rest(REST_GET, '/leads/export?sort=email')).status).toBe(403)
    // Only the export handler checks the query (400); GET /api/leads/:id would answer 403.
    expect((await rest(REST_GET, '/leads/export?sort[0]=a&sort[1]=b')).status).toBe(400)
  })

  it('gives staff a UTF-8 CSV of the leads matching the list filter', async () => {
    const res = await exportCsv({ where: { email: { equals: leads[0]!.email } } }, owner)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/csv/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/,
    )
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder().decode(bytes.slice(3))
    const [header, ...rows] = text.trimEnd().split('\r\n')
    expect(header).toMatch(/^Created \(IST\),Type,Status,Product,Name,Email,Phone/)
    // The message holds a line break, so the one record spans two physical lines.
    expect(rows.join('\n')).toContain(leads[0]!.email)
    expect(text).not.toContain(leads[1]!.email)
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(text).toContain(`'+91 98765 43210`)
    expect(text).toContain('"Hello, ""team""\nSecond line"')
    expect(text).toContain(',sales,"{""extra"":""x""}",hi,')
    expect(text).toContain(',yes,2026-10-17 00:05,')
  })

  it('applies the list search and sort', async () => {
    const res = await exportCsv({ search: run, sort: '-email' }, owner)
    const text = new TextDecoder().decode(new Uint8Array(await res.arrayBuffer()))
    expect(text.indexOf(leads[1]!.email)).toBeGreaterThan(0)
    expect(text.indexOf(leads[1]!.email)).toBeLessThan(text.indexOf(leads[0]!.email))
    expect(text).toContain('राहुल')
  })

  it('refuses anonymous requests', async () => {
    await expect(exportCsv({})).rejects.toMatchObject({ status: 403 })
  })

  it('rejects a malformed query', async () => {
    await expect(exportCsv({ sort: ['a', 'b'] }, owner)).rejects.toMatchObject({ status: 400 })
  })
})

describe('private files', () => {
  it('are never readable anonymously and never created through the API', async () => {
    await expect(
      payload.find({ collection: 'private-files', overrideAccess: false }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.create({
        collection: 'private-files',
        data: { purpose: 'cv' },
        file: { name: `${run}-api.pdf`, data: pdf, mimetype: 'application/pdf', size: pdf.length },
        ...asOwner(),
      }),
    ).rejects.toMatchObject({ status: 403 })

    const body = new FormData()
    body.append('_payload', JSON.stringify({ purpose: 'cv' }))
    body.append('file', new Blob([pdf], { type: 'application/pdf' }), `${run}-rest.pdf`)
    expect((await rest(REST_POST, '/private-files', { method: 'POST', body })).status).toBe(403)
    expect((await rest(REST_GET, '/private-files')).status).toBe(403)
  })

  it('are deleted with their lead', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: { type: 'careers', status: 'new', email: `cv-${run}@jainav.test` },
    })
    leads.push(lead)
    const upload = (owner: Lead | null, name: string) =>
      payload.create({
        collection: 'private-files',
        data: {
          purpose: 'cv',
          ...(owner && { owner: { relationTo: 'leads' as const, value: owner.id } }),
        },
        file: { name, data: pdf, mimetype: 'application/pdf', size: pdf.length },
      })
    const file = await upload(lead, `${run}-cv.pdf`)
    // Listed on the lead, but its owner link was never written.
    const unowned = await upload(null, `${run}-unowned.pdf`)
    const othersFile = await upload(leads[1]!, `${run}-other.pdf`)
    await payload.update({
      collection: 'leads',
      id: lead.id,
      data: { attachments: [file.id, unowned.id] },
    })
    const onDisk = path.resolve('private-files', file.filename!)
    expect(existsSync(onDisk)).toBe(true)

    const staffView = await payload.findByID({
      collection: 'private-files',
      id: file.id,
      depth: 0,
      ...asOwner(),
    })
    expect(staffView.url?.endsWith(`/api/private-files/file/${file.filename}`)).toBe(true)
    expect((await rest(REST_GET, `/private-files/file/${file.filename}`)).status).toBe(403)
    // Signed in: the file, and never kept by a shared cache (Cloudflare caches .pdf by default).
    const { token } = await payload.login({
      collection: 'users',
      data: { email: owner.email, password: `pw-${run}` },
    })
    const download = await rest(REST_GET, `/private-files/file/${file.filename}`, {
      headers: { Authorization: `JWT ${token}` },
    })
    expect(download.status).toBe(200)
    expect(download.headers.get('cache-control')).toBe('private, no-store')

    await payload.delete({ collection: 'leads', id: lead.id, ...asOwner() })
    const { totalDocs } = await payload.count({
      collection: 'private-files',
      where: { id: { in: [file.id, unowned.id] } },
    })
    expect(totalDocs).toBe(0)
    expect(existsSync(onDisk)).toBe(false)
    // Only that lead's files: another lead's CV stays (and goes with leads[1] in afterAll).
    const others = await payload.findByID({ collection: 'private-files', id: othersFile.id })
    expect(others.filename).toBe(othersFile.filename)
  })
})

describe('WhatsApp link', () => {
  it('adds India’s code to a 10-digit number and hides without a phone', () => {
    expect(whatsappHref('98765 43210')).toBe('https://wa.me/919876543210')
    expect(whatsappHref('098765-43210')).toBe('https://wa.me/919876543210')
    expect(whatsappHref('+44 20 7946 0958')).toBe('https://wa.me/442079460958')
    expect(whatsappHref('')).toBeNull()
    expect(whatsappHref(undefined)).toBeNull()
  })
})
