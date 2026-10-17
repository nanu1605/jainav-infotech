/**
 * Phase 8 account licensing in a real browser (spec §19 "Account device deactivation"): buy VYRO
 * Pro through the stand-in gateway, activate two devices with the key from the order email, see
 * both on the Licenses page, deactivate one there and use the freed slot; then axe on Licenses and
 * Downloads in both languages. Needs the dev server (the stand-in gateway), so it skips against
 * E2E_BASE_URL like the store suite.
 */
import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type TestInfo } from '@playwright/test'

import { address, fillCheckout, mailTo, pay, signIn, testIp, useOwnIp } from './helpers/store'

test.skip(!!process.env.E2E_BASE_URL, 'The stand-in gateway exists only in development')
// Sign-in, payment and first compiles of four account pages under parallel workers.
test.describe.configure({ timeout: 180_000 })

test.beforeEach(({ page }, info) => useOwnIp(page, info))

/** `VYRO-` and four groups of five Crockford Base32 characters (no I, L, O or U). */
const KEY = /\bVYRO(?:-[0-9A-HJKMNP-TV-Z]{5}){4}\b/

/** POST /api/v1/licensing/activate as VYRO would, from a new device each time. */
const activate = (
  request: APIRequestContext,
  info: TestInfo,
  licenseKey: string,
  deviceName: string,
) =>
  request.post('/api/v1/licensing/activate', {
    headers: { 'cf-connecting-ip': testIp(info) },
    data: {
      licenseKey,
      product: 'vyro',
      deviceId: randomBytes(32).toString('hex'),
      deviceName,
      os: 'Windows 11 Pro 26100',
      appVersion: '1.0.1',
    },
  })

test('a device deactivated from the account frees its slot', async ({ page, request }, info) => {
  const email = address('licenses')
  await signIn(page, email, '/checkout/vyro/pro')
  await fillCheckout(page)
  await pay(page)
  const licenseKey = (await mailTo(email, /is confirmed/)).text.match(KEY)?.[0]
  expect(licenseKey, 'license key in the order email').toBeTruthy()
  const key = licenseKey!

  for (const name of ['GAMING-PC', 'OFFICE-LAPTOP']) {
    expect((await activate(request, info, key, name)).status(), name).toBe(200)
  }
  const full = await activate(request, info, key, 'THIRD-PC')
  expect(full.status()).toBe(409)
  expect(((await full.json()) as { error: { code: string } }).error.code).toBe(
    'activation_limit_reached',
  )

  await page.goto('/account/licenses')
  const license = page.getByRole('region', { name: 'VYRO Pro' })
  await expect(license.getByLabel('License key')).toHaveValue(key)
  const devices = license.getByRole('listitem')
  await expect(devices).toHaveCount(2)
  await expect(license).toContainText('GAMING-PC')
  await expect(license).toContainText('OFFICE-LAPTOP')
  await expect(license).toContainText('2 of 2')
  await expect(license).toContainText('Deactivations left this month: 3.')

  // Copy announces itself politely.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await license.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect(license.getByText('Copied', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(key)

  // Deactivate asks first; cancelling keeps the device.
  await license.getByRole('button', { name: 'Deactivate GAMING-PC' }).click()
  await expect(license.getByRole('button', { name: 'Yes, deactivate' })).toBeFocused()
  await license.getByRole('button', { name: 'Cancel' }).click()
  await expect(license.getByRole('button', { name: 'Deactivate GAMING-PC' })).toBeFocused()
  await license.getByRole('button', { name: 'Deactivate GAMING-PC' }).click()
  await license.getByRole('button', { name: 'Yes, deactivate' }).click()
  await expect(devices).toHaveCount(1)
  await expect(license).not.toContainText('GAMING-PC')
  await expect(license).toContainText('1 of 2')
  await expect(license).toContainText('Deactivations left this month: 2.')

  // The freed slot takes another device.
  expect((await activate(request, info, key, 'THIRD-PC')).status()).toBe(200)
  await page.reload()
  await expect(devices).toHaveCount(2)
  await expect(license).toContainText('THIRD-PC')

  await page.goto('/account/downloads')
  await expect(page.getByRole('heading', { level: 2, name: 'VYRO' })).toBeVisible()

  for (const url of [
    '/account/licenses',
    '/account/downloads',
    '/hi/account/licenses',
    '/hi/account/downloads',
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
})
