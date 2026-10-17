/**
 * Store helpers shared by the e2e suites (spec §19): email-code sign-in from the outbox, the
 * checkout form and a payment through the development stand-in gateway.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, type Browser, type Page, type TestInfo } from '@playwright/test'

const OUTBOX = path.resolve('.outbox')
export const run = Date.now()
export const address = (name: string) => `${name}.${run}@example.test`

/** An IP of the test's own (the sign-in, checkout and licensing limits never trip across runs). */
export const testIp = (info: TestInfo) =>
  `198.19.${(run + info.workerIndex) % 250}.${(info.title.length * 11 + run) % 250}`

/** Sends the page's account and checkout calls from the test's own IP. */
export const useOwnIp = (page: Page, info: TestInfo) =>
  page.route(/\/api\/v1\/(account|checkout)\//, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': testIp(info) } }),
  )

export type Mail = {
  to: string
  subject: string
  text: string
  attachments?: { filename: string; contentType: string; size: number }[]
}

/** The newest email to `to` matching `subject`, waiting for the after-response send. */
export async function mailTo(to: string, subject: RegExp): Promise<Mail> {
  for (let i = 0; i < 60; i++) {
    const files = await readdir(OUTBOX).catch(() => [] as string[])
    for (const file of files.sort().reverse()) {
      const mail = JSON.parse(await readFile(path.join(OUTBOX, file), 'utf8')) as Mail
      if (mail.to === to && subject.test(mail.subject)) return mail
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No email to ${to} matching ${subject}`)
}

export async function signIn(page: Page, email: string, next = '/account') {
  await page.goto(`/account/sign-in?next=${encodeURIComponent(next)}`)
  const main = page.locator('main')
  await main.getByLabel('Email address').fill(email)
  await expect(main.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', {
    timeout: 20_000,
  })
  await main.getByRole('button', { name: 'Send code' }).click()
  await expect(main.getByLabel('6-digit code')).toBeFocused()
  const code = (await mailTo(email, /sign-in code/)).text.match(/\b(\d{6})\b/)![1]!
  await main.getByLabel('6-digit code').fill(code)
  await main.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((url) => url.pathname === next.split('?')[0])
}

export async function fillCheckout(page: Page) {
  await page.goto('/checkout/vyro/pro')
  const main = page.locator('main')
  await main.getByLabel('Full name').fill('Priya Sharma')
  await main.getByLabel('State').selectOption({ label: 'Maharashtra' })
  await main.getByRole('checkbox', { name: /I accept the Terms/ }).check()
  return main
}

/**
 * Pays the filled checkout form in the stand-in gateway's dialog (Razorpay's own in test mode on
 * staging) and waits for the success page. Returns the order number.
 */
export async function pay(page: Page) {
  await page.locator('main').getByRole('button', { name: /^Pay / }).click()
  const dialog = page.getByRole('dialog', { name: 'Test payment' })
  await dialog.getByRole('button', { name: 'Pay', exact: true }).click()
  await page.waitForURL(/\/checkout\/success\?order=JO-[0-9A-Z]{8}$/)
  return new URL(page.url()).searchParams.get('order')!
}

export const newPage = async (browser: Browser) => (await browser.newContext()).newPage()

/** Signs in to the admin as the Owner that `pnpm seed` creates from DEV_ADMIN_* in .env. */
export async function signInToAdmin(admin: Page) {
  await admin.goto('/admin/login')
  await admin.getByLabel(/^Email/).fill(process.env.DEV_ADMIN_EMAIL!)
  await admin.getByLabel(/^Password/).fill(process.env.DEV_ADMIN_PASSWORD!)
  await admin.getByRole('button', { name: 'Login' }).click()
  await admin.waitForURL(
    (url) => url.pathname.startsWith('/admin') && !url.pathname.endsWith('/login'),
  )
}
