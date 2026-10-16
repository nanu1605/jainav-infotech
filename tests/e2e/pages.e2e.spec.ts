/**
 * Phase 3 public pages (spec §20): every route in both languages, SEO tags per spec §6, product
 * buttons, redirects, feeds and axe. Needs the seeded, published local content (globalSetup).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = [
  '/',
  '/products',
  '/products/vyro',
  '/products/vyro/pricing',
  '/products/vyro/download',
  '/products/vyro/changelog',
  '/products/vyro/docs',
  '/products/vyro/support',
  '/products/baby',
  '/services',
  '/services/custom-software',
  '/about',
  '/contact',
  '/careers',
  '/blog',
  '/changelog',
  '/changelog/vyro',
]
const hi = (path: string) => (path === '/' ? '/hi' : `/hi${path}`)

for (const path of ROUTES) {
  for (const [locale, url] of [
    ['en', path],
    ['hi', hi(path)],
  ] as const) {
    test(`${url} renders in ${locale} with one h1`, async ({ page }) => {
      const res = await page.goto(url)
      expect(res?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.locator('html')).not.toHaveAttribute('id', '__next_error__')
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('main#main')).toBeVisible()
    })
  }
}

test('unknown pages 404 inside the site, in the visitor’s language', async ({ page }) => {
  expect((await page.goto('/no-such-page'))?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText("We couldn't find that page")
  expect((await page.goto('/hi/no-such-page'))?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText('यह पेज नहीं मिला')
})

test('the founder section shows the photo (a local upload) with a quote', async ({ page }) => {
  await page.goto('/about')
  const founder = page.locator('main article').filter({ hasText: 'About our founder' })
  await expect(founder.locator('blockquote')).not.toBeEmpty()
  const photo = founder.locator('img[src^="/_next/image"]')
  await photo.scrollIntoViewIfNeeded()
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
})

// Umami's tracker cancels clicks on a tracked <a> and reloads the page: tracking goes on a wrapper.
test('tracked links keep client-side navigation', async ({ page }) => {
  for (const path of ['/', '/products/vyro', '/products/baby']) {
    await page.goto(path)
    expect(await page.locator('[data-umami-event]').count()).toBeGreaterThan(0)
    await expect(page.locator('a[data-umami-event]')).toHaveCount(0)
  }
})

test('vanity /vyro redirects permanently and keeps the language', async ({ request }) => {
  for (const [from, to] of [
    ['/vyro', '/products/vyro'],
    ['/hi/vyro', '/hi/products/vyro'],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    // A production cache miss repeats the (identical) Location header: compare the first value.
    const location = res.headers().location!.split(',')[0]!.trim()
    expect(new URL(location, 'http://localhost:3000').pathname).toBe(to)
  }
})

test('code-built pages pair both languages through hreflang', async ({ page }) => {
  await page.goto('/hi/products')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/hi\/products$/)
  for (const lang of ['en', 'hi', 'x-default']) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1)
  }
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
})

test('Hindi pages that are not ready are noindex with a self canonical', async ({ page }) => {
  // The seeded VYRO page's Hindi status is not "ready".
  await page.goto('/hi/products/vyro')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/hi\/products\/vyro$/,
  )
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0)
})

test('product pages carry SoftwareApplication data and their share image', async ({ page }) => {
  await page.goto('/products/vyro')
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(ld.some((s) => JSON.parse(s)['@type'] === 'SoftwareApplication')).toBe(true)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/products\/vyro\.png$/,
  )
})

test('VYRO without a release offers the waitlist and a disabled Buy Pro', async ({ page }) => {
  await page.goto('/products/vyro')
  const hero = page.locator('section').first()
  await expect(hero.getByRole('link', { name: 'Join the waitlist' })).toHaveAttribute(
    'href',
    '/products/vyro#waitlist',
  )
  const buy = hero.getByRole('button', { name: /^Buy / })
  await expect(buy).toHaveAttribute('aria-disabled', 'true')
  await expect(hero.getByText('Available soon')).toBeVisible()
  await expect(page.locator('#waitlist')).toBeVisible()
})

test('a beta with no published build shows only the waitlist', async ({ page }) => {
  await page.goto('/products/baby')
  await expect(page.getByRole('link', { name: 'Join the waitlist' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /^Visit / })).toHaveCount(0)
  // External products have no hosted sub-pages.
  expect((await page.goto('/products/baby/pricing'))?.status()).toBe(404)
})

test('language switch on a product page keeps the page', async ({ page }) => {
  await page.goto('/products/vyro')
  await page.getByRole('link', { name: 'हिंदी', exact: true }).first().click()
  await expect(page).toHaveURL(/\/hi\/products\/vyro$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
})

test('sitemap lists ready pages in both languages and robots keeps crawlers out', async ({
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('<loc>http://localhost:3000/products</loc>')
  expect(sitemap).toContain('<loc>http://localhost:3000/hi/products</loc>')
  expect(sitemap).toContain('<loc>http://localhost:3000/products/vyro</loc>')
  expect(sitemap).not.toContain('<loc>http://localhost:3000/hi/products/vyro</loc>')
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toMatch(/Disallow: \/admin/)
  expect(robots).toMatch(/Disallow: \/api\//)
})

test('feeds and the update endpoint answer', async ({ request }) => {
  for (const feed of ['/feeds/en.xml', '/feeds/hi.xml']) {
    const res = await request.get(feed)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/rss+xml')
  }
  const update = await request.get('/api/v1/updates/no-such-app/windows/x86_64/1.0.0')
  expect(update.status()).toBe(204)
})

for (const url of [
  '/',
  '/products',
  '/products/vyro',
  '/products/vyro/pricing',
  '/about',
  '/contact',
  '/services',
  '/careers',
  '/blog',
]) {
  for (const path of [url, hi(url)]) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path)
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Radix NavigationMenu's empty focus proxy: aria-hidden on purpose, it only forwards focus.
        .exclude('nav li > span[aria-hidden="true"][tabindex="0"]:empty')
        .analyze()
      expect(
        axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([])
    })
  }
}
