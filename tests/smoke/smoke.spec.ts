/**
 * Post-deploy smoke tests (spec §18.3): the app and its database answer, pages render in both
 * languages with the security headers (spec §16), the update feed answers, and (once enabled)
 * Cloudflare Access guards the admin. Read-only: safe against production.
 */
import { expect, test } from '@playwright/test'

const staging = !!process.env.SMOKE_BASIC_AUTH

test('health check passes', async ({ request }) => {
  const res = await request.get('/api/v1/health')
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

for (const [path, lang] of [
  ['/', 'en'],
  ['/hi', 'hi'],
  // Code-built pages: they render before any content is published.
  ['/products', 'en'],
  ['/contact', 'en'],
] as const) {
  test(`${path} renders`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    await expect(page.locator('h1')).toHaveCount(1)
  })
}

test('pages carry the security headers', async ({ request }) => {
  const headers = (await request.get('/')).headers()
  expect(headers['content-security-policy']).toContain("object-src 'none'")
  expect(headers['strict-transport-security']).toContain('max-age=')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBeTruthy()
  expect(headers['permissions-policy']).toBeTruthy()
})

test('the update feed answers', async ({ request }) => {
  const res = await request.get('/api/v1/updates/vyro/windows/x86_64/0.0.1')
  expect([200, 204]).toContain(res.status())
})

test('robots.txt matches the environment', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()
  if (staging) expect(body).toMatch(/Disallow: \/\s*$/m)
  else expect(body).toContain('Disallow: /admin')
})

test('Cloudflare Access guards the admin', async ({ request }) => {
  test.skip(process.env.SMOKE_ADMIN_ACCESS !== '1', 'Access not enabled for this environment yet')
  const res = await request.get('/admin', { maxRedirects: 0 })
  expect([302, 303]).toContain(res.status())
  expect(res.headers().location).toMatch(/cloudflareaccess\.com/)
})
