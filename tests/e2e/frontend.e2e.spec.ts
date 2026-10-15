import { expect, test } from '@playwright/test'

test('English home renders unprefixed with lang="en"', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('h1')).toBeVisible()
})

test('Hindi home renders under /hi with lang="hi"', async ({ page }) => {
  await page.goto('/hi')
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
})

test('language switch keeps the page and remembers the choice', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'हिंदी' }).click()
  await expect(page).toHaveURL(/\/hi$/)
  expect(await page.evaluate(() => localStorage.getItem('jv-lang-pref'))).toBe('hi')
})

test('theme toggle sets data-theme and survives reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: /theme/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('English links have no /en prefix', async ({ page }) => {
  await page.goto('/hi')
  await expect(page.getByRole('link', { name: 'EN', exact: true }).first()).toHaveAttribute(
    'href',
    '/',
  )
})

// Client navigation into a page whose client components slot server-rendered links (MagneticButton
// asChild + Link) once crashed on Radix Slot's lazy-child handling.
for (const [from, to, name] of [
  ['/styleguide', /\/hi\/styleguide$/, 'हिंदी'],
  ['/hi/styleguide', /\/styleguide$/, 'EN'],
] as const) {
  test(`language switch on ${from} keeps the styleguide`, async ({ page }) => {
    await page.goto(from)
    await page.getByRole('link', { name, exact: true }).first().click()
    await expect(page).toHaveURL(to)
    await expect(page.locator('html')).not.toHaveAttribute('id', '__next_error__')
    await expect(page.locator('h1')).toBeVisible()
  })
}
