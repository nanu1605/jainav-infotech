/**
 * Waiting for a page to stop changing before axe measures it (spec §19). Forms stay disabled
 * until their code hydrates (LeadForm, MultiStepForm, the checkout's coupon form), and their
 * buttons then fade in from half opacity: axe checking mid-fade measures blended colours.
 */
import { expect, type Page } from '@playwright/test'

export async function settle(page: Page) {
  // The first visit to a form compiles its code on a cold dev server.
  await expect(page.locator('form fieldset[disabled]')).toHaveCount(0, { timeout: 20_000 })
  // Let transitions and entrance animations finish (looping ones never do).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  )
}
