/**
 * Phase 5 motion (spec §14, §20): reduced motion stops every loop, loops pause off-screen, the
 * signature animations cause no layout shift even under 6x CPU throttling, and the header's
 * products menu works from the keyboard. Needs the seeded, published local content.
 */
import { expect, test, type Page } from '@playwright/test'

const PAGES = ['/', '/products/menumesh', '/products/vyro', '/products/baby']
const ANIMATED = ['menumesh', 'vyro', 'baby']

/** Infinite CSS / Web Animations currently running. */
const loops = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
        .length,
  )

for (const slug of ANIMATED) {
  test(`${slug} shows its signature animation with a description`, async ({ page }) => {
    await page.goto(`/products/${slug}`)
    const art = page.locator(`[data-hero-animation="${slug}"] [role="img"]`).first()
    await expect(art).toBeVisible()
    expect((await art.getAttribute('aria-label'))?.length).toBeGreaterThan(20)
  })
}

for (const path of PAGES) {
  test(`${path}: reduced motion runs no loops`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    expect(await loops(page)).toBe(0)
  })

  test(`${path}: loops pause once off-screen`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(800)
    expect(await loops(page)).toBe(0)
  })

  test(`${path}: no layout shift under 6x CPU throttling`, async ({ page, context }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number }
      w.__cls = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[])
          if (!e.hadRecentInput) w.__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(path, { waitUntil: 'load' })
    for (let y = 0; y <= 4000; y += 500) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(500)
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    expect(cls).toBeLessThan(0.1)
  })
}

test('the products menu opens from the keyboard and Escape returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const trigger = page.locator('header nav button[aria-expanded]')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const panel = page.locator(`#${await trigger.getAttribute('aria-controls')}`)
  await expect(panel.getByRole('link').first()).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('link').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()
  await expect(trigger).not.toHaveAttribute('aria-controls')
})

// WCAG 2.2.2: every loop that starts on its own and runs past 5 s can be paused.
for (const [path, control] of [
  ['/', 'checkbox'],
  ['/products/vyro', 'button'],
  ['/products/baby', 'button'],
] as const) {
  test(`${path}: the pause control stops the hero's loops`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    expect(await loops(page)).toBeGreaterThan(0)
    const pause = page
      .locator('main')
      .getByRole(control, { name: /^Pause/ })
      .first()
    await expect(pause).toBeAttached()
    // The mesh's toggle is a visually hidden checkbox inside its icon label.
    if (control === 'checkbox') await page.locator('[data-mesh-pause]').click()
    else await pause.click()
    if (control === 'checkbox') await expect(pause).toBeChecked()
    await page.waitForTimeout(500)
    expect(await loops(page)).toBe(0)
  })
}
