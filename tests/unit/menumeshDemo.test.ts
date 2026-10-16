import { describe, expect, it } from 'vitest'

import {
  frame,
  localProgress,
  playRange,
  QR_PATH,
} from '@/components/product/animations/menumesh/scenes'

describe('MenuMesh demo scroll range', () => {
  it('starts at the page top for a hero above the fold, so the loaded frame is the still', () => {
    const range = playRange(200, 420, 900)
    expect(range.start).toBe(0)
    expect(localProgress(0, range)).toBe(0)
    expect(range.end - range.start).toBeGreaterThanOrEqual(240)
  })

  it('starts once a below-the-fold element is fully in view and ends before it leaves', () => {
    const range = playRange(700, 430, 812)
    expect(range.start).toBe(700 + 430 - 812)
    expect(range.end).toBeLessThan(700 + 430)
    expect(localProgress(range.start - 50, range)).toBe(0)
    expect(localProgress(range.end + 50, range)).toBe(1)
  })

  it('keeps the bottom edge, where the captions sit, below the 4rem sticky header while playing', () => {
    // Desktop hero above the fold, phone hero below it, landscape phone with a panel taller than
    // the viewport. 40px is the caption strip (a 14px caption plus its offset).
    for (const [top, height, viewport] of [
      [160, 438, 800],
      [600, 429, 812],
      [100, 573, 375],
    ] as const) {
      const { start, end } = playRange(top, height, viewport)
      expect(top + height - start).toBeLessThanOrEqual(viewport)
      expect(top + height - end).toBeGreaterThan(64 + 40)
    }
  })
})

describe('MenuMesh demo frames', () => {
  const visible = (t: number) =>
    Object.entries(frame(t))
      .filter(([, s]) => s.opacity > 0.99)
      .map(([part]) => part)
      .sort()

  it('opens on the menu with the table QR and first caption, nothing ordered yet', () => {
    expect(visible(0)).toEqual(['add-0', 'add-1', 'caption-0', 'cart-order', 'list', 'qr'].sort())
  })

  it('ends with both dishes added, the order sent and the kitchen ticket shown', () => {
    expect(visible(1)).toEqual(
      ['caption-3', 'cart', 'cart-sent', 'list', 'step-0', 'step-1', 'ticket'].sort(),
    )
  })

  it('shows exactly one caption in the middle of each scene', () => {
    for (const [i, t] of [0.12, 0.37, 0.62, 0.87].entries())
      expect(visible(t).filter((p) => p.startsWith('caption-'))).toEqual([`caption-${i}`])
  })

  it('only ever animates opacity in 0–1', () => {
    for (let t = 0; t <= 1; t += 0.01)
      for (const s of Object.values(frame(t))) {
        expect(s.opacity).toBeGreaterThanOrEqual(0)
        expect(s.opacity).toBeLessThanOrEqual(1)
      }
  })
})

it('draws a deterministic QR path of whole-module runs', () => {
  expect(QR_PATH).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/)
  expect(QR_PATH.startsWith('M0 0h7v1h-7z')).toBe(true)
})
