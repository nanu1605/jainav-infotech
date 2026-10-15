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
