/**
 * Phase 4 forms in a real browser (spec §19): contact, start-a-project, waitlist, careers with a
 * CV, newsletter confirm and unsubscribe, and Hindi validation. Turnstile runs with Cloudflare's
 * test keys (the dev defaults); emails are read back from the development outbox (.outbox/).
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const OUTBOX = path.resolve('.outbox')
const run = Date.now()
const address = (name: string) => `${name}.${run}@example.test`

/** Each test posts from its own address, so per-IP rate limits never trip across runs. */
test.beforeEach(async ({ page }, info) => {
  const ip = `198.18.${(run + info.workerIndex) % 250}.${(info.title.length * 7 + run) % 250}`
  await page.route('**/api/v1/forms/**', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': ip } }),
  )
})

type Mail = { to: string; subject: string; text: string; headers?: Record<string, string> }

/** The newest email sent to `to`, waiting for the after-response send. */
async function mailTo(to: string): Promise<Mail> {
  for (let i = 0; i < 40; i++) {
    const files = await readdir(OUTBOX).catch(() => [] as string[])
    for (const file of files.sort().reverse()) {
      const mail = JSON.parse(await readFile(path.join(OUTBOX, file), 'utf8')) as Mail
      if (mail.to === to) return mail
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`No email to ${to}`)
}

/** Turnstile's test key passes on its own; wait for its token before submitting. */
const turnstileReady = (scope: ReturnType<Page['locator']>) =>
  expect(scope.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', {
    timeout: 20_000,
  })

test('contact form validates, sends, confirms and emails a localized auto-reply', async ({
  page,
}) => {
  await page.goto('/contact?product=vyro&topic=support')
  const form = page.locator('main form')
  await expect(form.getByLabel(/^Topic/)).toHaveValue('support')
  await expect(form.getByLabel(/^Product/)).toHaveValue('vyro')

  // Presets come from the link; validation from an empty form.
  await page.goto('/contact')
  await form.getByRole('button', { name: 'Send message' }).click()
  await expect(form.getByText('Choose an option.')).toBeVisible()
  await expect(form.getByLabel(/^Topic/)).toBeFocused()

  const email = address('contact')
  await form.getByLabel(/^Topic/).selectOption('sales')
  await form.getByLabel(/^Name/).fill('E2E Tester')
  await form.getByLabel(/^Email/).fill(email)
  await form.getByLabel(/^Message/).fill('Testing the contact form end to end.')
  await turnstileReady(form)
  await form.getByRole('button', { name: 'Send message' }).click()

  const done = page.getByRole('status').filter({ hasText: 'Thanks, your message' })
  await expect(done).toBeVisible()
  await expect(done).toBeFocused()
  const mail = await mailTo(email)
  expect(mail.subject).toBe("We've received your message")
  expect(mail.text).not.toContain('Testing the contact form')
})

test('the Hindi contact form shows Hindi errors', async ({ page }) => {
  await page.goto('/hi/contact')
  const form = page.locator('main form')
  await form.getByRole('button', { name: 'संदेश भेजें' }).click()
  await expect(form.getByText('यह फ़ील्ड ज़रूरी है।').first()).toBeVisible()
})

test('start a project walks five steps and sends the brief', async ({ page }) => {
  await page.goto('/services?service=custom-software#start')
  const form = page.locator('#start form')
  await expect(form.getByRole('radio', { checked: true })).toHaveCount(1)
  await form.getByRole('button', { name: 'Next' }).click()

  await form.getByLabel('Describe your project').fill('A booking system for a chain of clinics.')
  await form.getByRole('button', { name: 'Next' }).click()
  await form.getByRole('radio', { name: /₹2–5 lakh/ }).check()
  await form.getByRole('button', { name: 'Next' }).click()
  await form.getByRole('radio', { name: /In 1–3 months/ }).check()
  await form.getByRole('button', { name: 'Next' }).click()

  const email = address('project')
  await form.getByLabel(/^Name/).fill('E2E Tester')
  await form.getByLabel(/^Email/).fill(email)
  await turnstileReady(form)
  await form.getByRole('button', { name: 'Send project brief' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'project brief' })).toBeVisible()
  expect((await mailTo(email)).subject).toBe("We've received your project brief")
})

test('a coming-soon product takes waitlist sign-ups', async ({ page }) => {
  await page.goto('/products/baby')
  await page.getByRole('link', { name: 'Join the waitlist' }).first().click()
  const form = page.locator('#waitlist form')
  const email = address('waitlist')
  await form.getByLabel(/^Email/).fill(email)
  await turnstileReady(form)
  await form.getByRole('button', { name: 'Join the waitlist' }).click()
  await expect(page.getByRole('status').filter({ hasText: "You're on the list" })).toBeVisible()
  expect((await mailTo(email)).subject).toBe("You're on the Baby waitlist")
})

test('careers takes a PDF CV and refuses other files', async ({ page }) => {
  await page.goto('/careers')
  const form = page.locator('main form')
  const email = address('careers')
  await form.getByLabel(/^Name/).fill('E2E Tester')
  await form.getByLabel(/^Email/).fill(email)
  const cv = form.getByLabel(/^CV/)
  await cv.setInputFiles({
    name: 'cv.docx',
    mimeType: 'application/msword',
    buffer: Buffer.from('x'),
  })
  await form.getByRole('button', { name: 'Send application' }).click()
  await expect(form.getByText('The CV must be a PDF file.')).toBeVisible()

  await cv.setInputFiles({
    name: 'cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.4\n${' '.repeat(500)}\nxref\n0 1\ntrailer\nstartxref\n9\n%%EOF\n`),
  })
  await turnstileReady(form)
  await form.getByRole('button', { name: 'Send application' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Application received' })).toBeVisible()
  expect((await mailTo(email)).subject).toBe("We've received your application")
})

test('newsletter: sign up in the footer, confirm by email, unsubscribe', async ({ page }) => {
  await page.goto('/hi/blog')
  const form = page.locator('footer form')
  await form.scrollIntoViewIfNeeded()
  const email = address('news')
  await form.getByLabel(/^ईमेल/).fill(email)
  await turnstileReady(form)
  await form.getByRole('button', { name: 'सब्सक्राइब करें' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'अपना इनबॉक्स देखें' })).toBeVisible()

  const mail = await mailTo(email)
  expect(mail.subject).toBe('अपने सब्सक्रिप्शन की पुष्टि करें')
  const confirmUrl = mail.text.match(/http\S+\/newsletter\/confirm\?token=[\w-]+/)?.[0]
  expect(confirmUrl).toBeTruthy()
  await page.goto(confirmUrl!)
  await expect(page).toHaveURL(/\/hi\/newsletter\/confirmed$/)
  await expect(page.locator('h1')).toHaveText('आपने सब्सक्राइब कर लिया है')

  const unsubscribe = mail.headers?.['List-Unsubscribe']?.slice(1, -1)
  expect(unsubscribe).toBeTruthy()
  await page.goto(unsubscribe!)
  await expect(page).toHaveURL(/\/hi\/newsletter\/unsubscribed$/)
  await expect(page.locator('h1')).toHaveText('आपने अनसब्सक्राइब कर दिया है')
})

test('form pages pass axe', async ({ page }) => {
  for (const url of ['/contact', '/hi/contact', '/careers', '/services', '/products/baby']) {
    await page.goto(url)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Cloudflare's challenge frame is third-party markup.
      .exclude('iframe')
      .analyze()
    expect(results.violations, url).toEqual([])
  }
})
