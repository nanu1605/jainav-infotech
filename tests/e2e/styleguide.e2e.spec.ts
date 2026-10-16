/**
 * Phase 2 "done when" (spec §20): every component in light/dark × English/Hindi without overflow
 * or clipped matras, axe passes, and reduced motion turns non-essential motion off.
 * Screenshots land in test-results/ for visual review (spec §19).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const LOCALES = [
  { locale: 'en', path: '/styleguide' },
  { locale: 'hi', path: '/hi/styleguide' },
] as const
const SCHEMES = ['light', 'dark'] as const

async function open(page: Page, path: string, { settle = true } = {}) {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Scroll through once so in-view effects (reveals, lazy media) settle before checks.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  // Let entrance animations finish (looping ones like the marquee never do).
  if (settle)
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
    )
}

/** Text clipped by its own box: scrollHeight exceeds the visible height with overflow hidden. */
const clippedText = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('main *')) {
      if (!el.textContent?.trim() || el.closest('[aria-hidden="true"], .sr-only')) continue
      const style = getComputedStyle(el)
      if (style.position === 'absolute' && el.clientHeight <= 1) continue // visually hidden
      const clips = ['hidden', 'clip'].includes(style.overflowY)
      if (clips && el.scrollHeight > el.clientHeight + 1 && el.children.length === 0) {
        out.push(
          `${el.tagName.toLowerCase()}.${el.className}: "${el.textContent.trim().slice(0, 40)}"`,
        )
      }
    }
    return out
  })

for (const { locale, path } of LOCALES) {
  for (const scheme of SCHEMES) {
    test(`styleguide ${locale} ${scheme}: accessible, unclipped, no horizontal overflow`, async ({
      page,
    }, info) => {
      await page.emulateMedia({ colorScheme: scheme })
      await open(page, path)

      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Radix NavigationMenu's empty focus proxy: aria-hidden on purpose, it only forwards focus.
        .exclude('nav li > span[aria-hidden="true"][tabindex="0"]:empty')
        .analyze()
      expect(
        axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([])

      expect(await clippedText(page)).toEqual([])

      await page.screenshot({
        path: info.outputPath(`styleguide-${locale}-${scheme}.png`),
        fullPage: true,
      })
    })
  }

  test(`styleguide ${locale} mobile: no horizontal page scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

test('reduced motion: no running animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Check right after scrolling: waiting for animations to settle would hide the ones that ran.
  await open(page, '/styleguide', { settle: false })
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running' && Number(a.effect?.getTiming().duration ?? 0) > 50)
      .map((a) => (a.effect as KeyframeEffect | null)?.target?.className ?? 'unknown'),
  )
  expect(running).toEqual([])
})
