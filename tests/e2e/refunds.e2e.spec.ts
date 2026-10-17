/**
 * Phase 9 refunds in a real browser (spec §20 Phase 9 "done when"): a customer buys VYRO Pro
 * through the stand-in gateway; the Owner signs in to the admin, opens the order and refunds part
 * of it with a reason in the order's Refund drawer; once the gateway's webhook arrives the order is
 * partly refunded with a credit note, the customer has the refund email, and their Orders page
 * lists the credit note (axe in both languages). Needs the dev server (the stand-in gateway) and
 * the Owner that `pnpm seed` creates from DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { address, fillCheckout, mailTo, newPage, pay, signIn, useOwnIp } from './helpers/store'

const { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD } = process.env
const CREDIT_NOTE = /JC\/\d{2}-\d{2}\/\d{5}/

test.skip(!!process.env.E2E_BASE_URL, 'The stand-in gateway exists only in development')
test.skip(!DEV_ADMIN_EMAIL || !DEV_ADMIN_PASSWORD, 'Needs the seeded Owner (DEV_ADMIN_* in .env)')
// A purchase, the admin's first compiles and a webhook round trip.
test.describe.configure({ timeout: 180_000 })

test.beforeEach(({ page }, info) => useOwnIp(page, info))

async function signInToAdmin(admin: Page) {
  await admin.goto('/admin/login')
  await admin.getByLabel(/^Email/).fill(DEV_ADMIN_EMAIL!)
  await admin.getByLabel(/^Password/).fill(DEV_ADMIN_PASSWORD!)
  await admin.getByRole('button', { name: 'Login' }).click()
  await admin.waitForURL(
    (url) => url.pathname.startsWith('/admin') && !url.pathname.endsWith('/login'),
  )
}

test('the Owner refunds part of an order and the customer sees the credit note', async ({
  page,
  browser,
}) => {
  const email = address('refund')
  await signIn(page, email, '/checkout/vyro/pro')
  await fillCheckout(page)
  const orderNumber = await pay(page)
  await mailTo(email, /is confirmed/)

  const admin = await newPage(browser)
  await signInToAdmin(admin)
  // The admin's REST API with the Owner's cookie: the order as stored.
  const stored = async () => {
    const res = await admin.request.get(
      `/api/orders?where[orderNumber][equals]=${orderNumber}&depth=1`,
    )
    const { docs } = (await res.json()) as {
      docs: { id: number; status: string; creditNotes?: { number: string }[] }[]
    }
    return docs[0]!
  }
  const { id } = await stored()

  await admin.goto(`/admin/collections/orders/${id}`)
  await admin.getByRole('button', { name: 'Refund…' }).click()
  const drawer = admin.locator('.drawer').filter({ hasText: `Refunds for order ${orderNumber}` })
  await expect(drawer).toContainText('Can be refunded now: ₹999')
  await drawer.getByLabel(/^Amount in rupees/).fill('400')
  await drawer.getByLabel(/^Reason/).fill('Partial refund from the end-to-end test')
  await drawer.getByRole('button', { name: 'Review refund' }).click()
  const confirm = admin.locator('.confirmation-modal')
  await expect(confirm).toContainText('Refund ₹400?')
  await confirm.getByRole('button', { name: 'Refund', exact: true }).click()
  await expect(admin.getByText(/Refund of ₹400 requested/)).toBeVisible()

  // Razorpay's (the stand-in's) refund.processed webhook does the rest.
  await expect
    .poll(
      async () => {
        const order = await stored()
        return { status: order.status, notes: order.creditNotes?.map((n) => n.number) ?? [] }
      },
      { timeout: 30_000 },
    )
    .toEqual({ status: 'partially-refunded', notes: [expect.stringMatching(CREDIT_NOTE)] })
  const refundMail = await mailTo(email, /^Refund for order/)
  expect(refundMail.text).toContain('₹400')
  expect(refundMail.attachments).toEqual([
    expect.objectContaining({ contentType: 'application/pdf' }),
  ])

  // The drawer now shows what is left, and the request is no longer pending.
  await admin.reload()
  await admin.getByRole('button', { name: 'Refund…' }).click()
  await expect(drawer).toContainText('Can be refunded now: ₹599')
  await expect(drawer).not.toContainText('Waiting for Razorpay')

  for (const [url, status] of [
    ['/account/orders', 'Partly refunded'],
    ['/hi/account/orders', 'आंशिक रिफ़ंड'],
  ] as const) {
    await page.goto(url)
    const row = page.getByRole('row', { name: new RegExp(orderNumber) })
    await expect(row).toContainText(status)
    const link = row.getByRole('link', { name: new RegExp(CREDIT_NOTE.source) })
    await expect(link).toBeVisible()
    const pdf = await page.request.get((await link.getAttribute('href'))!)
    expect(pdf.headers()['content-type']).toBe('application/pdf')
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
})
