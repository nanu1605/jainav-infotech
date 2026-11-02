/**
 * Phase 7 store in a real browser (spec §19): email-code sign-in from the outbox, a purchase
 * through the development stand-in gateway (its webhooks included), the success page refusing
 * other customers, a failed payment, the GSTIN lock, Hindi pages and axe. Needs the dev server:
 * production builds have no stand-in gateway, so the file skips against E2E_BASE_URL.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { address, fillCheckout, mailTo, newPage, pay, signIn, useOwnIp } from './helpers/store'

test.skip(!!process.env.E2E_BASE_URL, 'The stand-in gateway exists only in development')
// Each test signs in through an email (Turnstile, the outbox) and some pay: more than the default
// 30 seconds when pages compile for the first time under parallel workers.
test.describe.configure({ timeout: 120_000 })

/** Every test signs in from its own IP: the sign-in and checkout limits never trip across runs. */
test.beforeEach(({ page }, info) => useOwnIp(page, info))

test('signs in with an emailed code, pays and gets the invoice', async ({ page, browser }) => {
  const email = address('buyer')
  await signIn(page, email, '/checkout/vyro/pro')
  await fillCheckout(page)
  const orderNumber = await pay(page)
  await expect(page.locator('h1')).toHaveText('Thank you for your purchase')
  const invoice = page.getByRole('link', { name: /Download invoice JI\/\d{2}-\d{2}\/\d{5}/ })
  await expect(invoice).toBeVisible({ timeout: 30_000 })
  const pdf = await page.request.get((await invoice.getAttribute('href'))!)
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-')
  // The license key, as in the email (spec §11.3 step 11).
  const key = page.getByRole('textbox', { name: 'License key' })
  await expect(key).toHaveValue(/^VYRO(-[0-9A-HJKMNP-TV-Z]{5}){4}$/)

  const confirmation = await mailTo(email, /is confirmed/)
  expect(confirmation.text).toContain(await key.inputValue())
  expect(confirmation.attachments).toEqual([
    expect.objectContaining({
      contentType: 'application/pdf',
      filename: expect.stringMatching(/\.pdf$/),
    }),
  ])

  // A paid order never shows the "not confirmed" page.
  await page.goto(`/checkout/failed?order=${orderNumber}`)
  await expect(page).toHaveURL(new RegExp(`/checkout/success\\?order=${orderNumber}$`))

  // The order is listed with its invoice.
  await page.goto('/account/orders')
  await expect(page.getByRole('table')).toContainText(orderNumber)

  // Another customer can't open this order's success page (spec §11.3 step 11).
  const stranger = await newPage(browser)
  await signIn(stranger, address('stranger'))
  const res = await stranger.goto(`/checkout/success?order=${orderNumber}`)
  expect(res?.status()).toBe(404)
})

test('the checkout shows the refund and delivery pages before paying', async ({ page }) => {
  await signIn(page, address('policies'), '/checkout/vyro/pro')
  const main = page.locator('main')
  for (const [name, href] of [
    ['Refunds and Cancellation', '/legal/refunds-cancellation'],
    ['Shipping and Delivery', '/legal/shipping-delivery'],
  ] as const) {
    const link = main.getByRole('link', { name: new RegExp(name) })
    await expect(link).toHaveAttribute('href', href)
    await expect(link).toHaveAttribute('target', '_blank')
    expect((await page.request.get(href)).status(), href).toBe(200)
  }
  // GST is off in these runs: nothing promises a GST invoice or input tax credit.
  await expect(main.getByText(/We don't charge GST at the moment/)).toBeVisible()
  await expect(main).not.toContainText('For a GST invoice')
  await page.goto('/account/settings')
  await expect(page.locator('main').getByText(/We don't charge GST at the moment/)).toBeVisible()
  await expect(page.locator('main')).not.toContainText('input tax credit')
})

test('the page after an unconfirmed payment promises no outcome', async ({ page }) => {
  const res = await page.goto('/checkout/failed')
  expect(res?.status()).toBe(200)
  const main = page.locator('main')
  await expect(main.getByText(/If money left your account/)).toBeVisible()
  await expect(main).not.toContainText('No money was taken')
  await page.goto('/hi/checkout/failed')
  await expect(page.locator('main').getByText(/खाते से पैसे कट गए/)).toBeVisible()
})

test('a failed payment keeps the form for another try', async ({ page }) => {
  await signIn(page, address('failed'), '/checkout/vyro/pro')
  const main = await fillCheckout(page)
  await main.getByRole('button', { name: /^Pay / }).click()
  await page
    .getByRole('dialog', { name: 'Test payment' })
    .getByRole('button', { name: 'Fail the payment' })
    .click()
  await expect(main.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/checkout\/vyro\/pro$/)
  await expect(main.getByRole('button', { name: /^Pay / })).toBeEnabled()
})

test('a GSTIN sets the place of supply and the breakdown follows it', async ({ page }) => {
  await signIn(page, address('gstin'), '/checkout/vyro/pro')
  await page.goto('/checkout/vyro/pro')
  const main = page.locator('main')
  await main.getByLabel('GSTIN').fill('29AAGCB7383J1Z4')
  await expect(main.getByLabel('State')).toHaveValue('29')
  await expect(main.getByText(/the place of supply is the state/)).toBeVisible()
})

test('the sign-in page refuses an outside "next" link', async ({ page }) => {
  await signIn(page, address('next'), '/account')
  for (const next of ['//evil.example', '/\\evil.example', 'https://evil.example']) {
    await page.goto(`/account/sign-in?next=${encodeURIComponent(next)}`)
    await expect(page).toHaveURL(/\/account$/)
  }
})

test('store pages render in Hindi and pass axe', async ({ page }) => {
  await signIn(page, address('axe'), '/account')
  for (const url of [
    '/account',
    '/account/orders',
    '/account/settings',
    '/checkout/vyro/pro',
    '/hi/account',
    '/hi/account/settings',
    '/hi/checkout/vyro/pro',
  ]) {
    const res = await page.goto(url)
    expect(res?.status(), url).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', url.startsWith('/hi') ? 'hi' : 'en')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('nav li > span[aria-hidden="true"][tabindex="0"]:empty')
      .analyze()
    expect(
      axe.violations.map(
        (v) => `${url} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([])
  }
  const signedOut = await (await page.context().browser()!.newContext()).newPage()
  await signedOut.goto('/account/orders')
  await expect(signedOut).toHaveURL(/\/account\/sign-in\?next=%2Faccount%2Forders$/)
  const axe = await new AxeBuilder({ page: signedOut }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
})
