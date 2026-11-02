/**
 * Phase 9 admin screens in a real browser: the Reports page and its CA download, the daily-stats
 * insights, and a waitlist email's test send. Needs the dev server and the seeded Owner.
 */
import { expect, test } from '@playwright/test'

import { mailTo, signInToAdmin } from './helpers/store'

test.skip(!!process.env.E2E_BASE_URL, 'Uses the development outbox')
test.skip(
  !process.env.DEV_ADMIN_EMAIL || !process.env.DEV_ADMIN_PASSWORD,
  'Needs the seeded Owner (DEV_ADMIN_* in .env)',
)
test.describe.configure({ timeout: 120_000 })

test('the Owner downloads the CA report and sees the insights', async ({ page }) => {
  await signInToAdmin(page)
  // The nav is closed at the test's viewport: check the link, then follow it.
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Reports', exact: true }),
  ).toHaveAttribute('href', '/admin/reports')
  await page.goto('/admin/reports')
  await expect(page.getByRole('heading', { name: 'Monthly reports' })).toBeVisible()

  const ca = page.getByRole('link', { name: 'CA report (CSV)' })
  const href = await ca.getAttribute('href')
  expect(href).toMatch(/^\/api\/reports\/ca\?month=\d{4}-\d{2}$/)
  // In the page: Payload takes the cookie only with the browser's Origin / Sec-Fetch-Site.
  const csv = await page.evaluate(async (url) => (await fetch(url)).text(), href!)
  // text() drops the BOM (the unit tests check it).
  expect(csv).toMatch(/^Type,Number,Date,Against invoice/)
  expect(csv).toContain('SAC summary')

  await page.goto('/admin/collections/daily-stats')
  await expect(page.getByRole('table').filter({ hasText: 'Top keys (30 days)' })).toHaveCount(2)
})

test('the Owner deletes a customer’s account', async ({ page }) => {
  await signInToAdmin(page)
  const id = await page.evaluate(async (email) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: 'Priya Sharma', status: 'active' }),
    })
    return ((await res.json()) as { doc: { id: number } }).doc.id
  }, `gone.${Date.now()}@example.test`)

  await page.goto(`/admin/collections/customers/${id}`)
  await page.getByRole('button', { name: 'Delete account' }).click()
  await page.locator('.confirmation-modal').getByRole('button', { name: 'Delete account' }).click()
  await expect(page.getByText('The account is deleted')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Delete account' })).toHaveCount(0)
  const customer = await page.evaluate(
    async (url) => (await fetch(url)).json() as Promise<{ email: string; status: string }>,
    `/api/customers/${id}`,
  )
  expect(customer).toMatchObject({ email: `deleted-${id}@deleted.invalid`, status: 'deleted' })
})

test('the Owner sends a waitlist email test to themselves', async ({ page }) => {
  await signInToAdmin(page)
  const subject = `Launch news ${Date.now()}`
  const id = await page.evaluate(async (subject) => {
    const products = await (await fetch('/api/products?where[slug][equals]=vyro&depth=0')).json()
    const res = await fetch('/api/waitlist-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: products.docs[0].id,
        subject,
        body: 'VYRO is nearly here.\n\nThank you for waiting.',
      }),
    })
    return ((await res.json()) as { doc: { id: number } }).doc.id
  }, subject)

  await page.goto(`/admin/collections/waitlist-emails/${id}`)
  await expect(page.getByText(/(person|people) can get it\./)).toBeVisible()
  await page.getByRole('button', { name: 'Send a test to me' }).click()
  await expect(page.getByText('Test sent to your email')).toBeVisible()

  const mail = await mailTo(process.env.DEV_ADMIN_EMAIL!, new RegExp(`^\\[Test\\] ${subject}`))
  expect(mail.text).toContain('Thank you for waiting.')
  // A test changes nothing: the email is still a draft.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Send a test to me' })).toBeVisible()

  // A failed count says so and still allows a test; the real send waits for a count.
  await page.route(`**/api/waitlist-emails/${id}/recipients`, (route) =>
    route.fulfill({ status: 500, json: { errors: [{ message: 'Something went wrong.' }] } }),
  )
  await page.reload()
  await expect(page.getByText('Couldn’t count recipients. Reload to try again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send a test to me' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Send…', exact: true })).toBeDisabled()
})
