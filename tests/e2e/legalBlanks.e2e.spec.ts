/**
 * What the site says about the company while details are still to come (spec §21), and the named
 * contact Companies rule 26 wants. Publishing counts as approval (spec §8.13): the Owner can't
 * publish a legal page that still has a blank, and the edit view says what is left, even when the
 * blank is in the other language.
 */
import { expect, test, type APIRequestContext } from '@playwright/test'

import { signInToAdmin } from './helpers/store'

const PUBLIC_PAGES = [
  '/',
  '/products',
  '/products/vyro',
  '/products/vyro/pricing',
  '/products/baby',
  '/services',
  '/about',
  '/contact',
  '/careers',
  '/blog',
  '/changelog',
]

const ownerToken = async (request: APIRequestContext) => {
  const login = await request.post('/api/users/login', {
    data: { email: process.env.DEV_ADMIN_EMAIL, password: process.env.DEV_ADMIN_PASSWORD },
  })
  return ((await login.json()) as { token: string }).token
}

const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
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

test('no page prints a blank, with one in site settings', async ({ page, request }) => {
  test.skip(!process.env.DEV_ADMIN_EMAIL, 'Needs the seeded Owner (DEV_ADMIN_* in .env)')
  test.setTimeout(180_000)
  const headers = { Authorization: `JWT ${await ownerToken(request)}` }
  const settings = (await (
    await request.get('/api/globals/site-settings', { headers })
  ).json()) as {
    company?: { cin?: string | null }
  }
  const setCin = (cin: string | null) =>
    request.post('/api/globals/site-settings', { headers, data: { company: { cin } } })
  try {
    await setCin('{{CIN}}')
    for (const path of PUBLIC_PAGES) {
      await page.goto(path)
      expect(await page.content(), path).not.toContain('{{')
      await expect(page.locator('footer address')).toBeVisible()
      await page.goto(path === '/' ? '/hi' : `/hi${path}`)
      expect(await page.content(), `/hi${path}`).not.toContain('{{')
    }
  } finally {
    await setCin(settings.company?.cin ?? null)
  }
})

test('the footer names the Grievance Officer once set, in both languages', async ({
  page,
  request,
}) => {
  test.skip(!process.env.DEV_ADMIN_EMAIL, 'Needs the seeded Owner (DEV_ADMIN_* in .env)')
  const token = await ownerToken(request)
  const setOfficer = async (locale: 'en' | 'hi', name: string | null, title: string | null) => {
    const res = await request.post(`/api/globals/site-settings?locale=${locale}`, {
      headers: { Authorization: `JWT ${token}` },
      data: { company: { grievanceOfficer: { name, title } } },
    })
    expect(res.status()).toBe(200)
  }
  const legal = page.locator('footer address')
  try {
    await setOfficer('en', 'Asha Rao', 'Director')
    await setOfficer('hi', 'आशा राव', 'निदेशक')
    await page.goto('/')
    await expect(legal).toContainText('Grievance Officer: Asha Rao, Director')
    // The rest of the company's details survive the partial save.
    await expect(legal).toContainText('Registered office:')
    await page.goto('/hi')
    await expect(legal).toContainText('शिकायत अधिकारी: आशा राव, निदेशक')

    // Hindi falls back to English; a title is optional.
    await setOfficer('hi', null, null)
    await setOfficer('en', 'Asha Rao', null)
    await page.goto('/hi')
    await expect(legal).toContainText('शिकायत अधिकारी: Asha Rao')
    await expect(legal).not.toContainText('Director')
  } finally {
    await setOfficer('hi', null, null)
    await setOfficer('en', null, null)
  }
  await page.goto('/')
  await expect(legal).not.toContainText('Grievance Officer')
})

test('the admin refuses to publish a blank in the other language, and names it', async ({
  page,
  request,
}) => {
  test.skip(!process.env.DEV_ADMIN_EMAIL, 'Needs the seeded Owner (DEV_ADMIN_* in .env)')
  const headers = { Authorization: `JWT ${await ownerToken(request)}` }
  const created = await request.post('/api/legal-pages?locale=en&draft=true', {
    headers,
    data: {
      title: 'Blank test',
      slug: `blank-${Date.now()}`,
      body: richText('Full text'),
      version: '1.0',
      effectiveDate: '2026-11-01T00:00:00.000Z',
      hiStatus: 'draft',
      _status: 'draft',
    },
  })
  expect(created.status()).toBe(201)
  const { doc } = (await created.json()) as { doc: { id: number } }
  try {
    const hindi = await request.patch(`/api/legal-pages/${doc.id}?locale=hi&draft=true`, {
      headers,
      data: { title: 'खाली', body: richText('CIN: {{CIN}}') },
    })
    expect(hindi.status()).toBe(200)

    await signInToAdmin(page)
    await page.goto(`/admin/collections/legal-pages/${doc.id}`)
    await page.getByRole('button', { name: 'Publish changes' }).click()
    // In the toast on every build. Only a dev server also marks the field: a production build
    // returns just the message.
    await expect(
      page.locator('.payload-toast-container').getByText('Fill these in first. Hindi: {{CIN}}.'),
    ).toBeVisible()

    const live = await request.get(`/api/legal-pages/${doc.id}`)
    expect(live.status()).toBe(404)
  } finally {
    await request.delete(`/api/legal-pages/${doc.id}`, { headers })
  }
})
