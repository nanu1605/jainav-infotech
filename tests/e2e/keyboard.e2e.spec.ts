/**
 * Keyboard support for the interactive primitives (spec §15): everything reachable and operable
 * without a mouse, overlays close on Escape and give focus back to what opened them.
 */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/styleguide')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Keys pressed before React hydrates do nothing: wait until buttons carry React's props.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('main button')].every((el) =>
      Object.keys(el).some((key) => key.startsWith('__reactProps')),
    ),
  )
})

test('tabs move with arrow keys', async ({ page }) => {
  const tabs = page.getByTestId('content-light').getByRole('tablist').first().getByRole('tab')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
})

test('accordion toggles with Enter', async ({ page }) => {
  // aria-expanded stays on the trigger in both states (Radix drops aria-controls when closed).
  const trigger = page.getByTestId('content-light').locator('button[aria-expanded]').first()
  const before = await trigger.getAttribute('aria-expanded')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', before === 'true' ? 'false' : 'true')
})

test('mobile menu opens from the keyboard, closes on Escape and restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const open = page
    .getByTestId('navigation-light')
    .getByRole('button', { name: 'Open menu' })
    .first()
  await open.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('dialog')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeVisible()
  // Focus is trapped inside the menu.
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab')
  expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(open).toBeFocused()
})

test('dialogs close on Escape and restore focus', async ({ page }) => {
  const trigger = page
    .getByTestId('feedback-light')
    .locator('button[aria-haspopup="dialog"]')
    .first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})
