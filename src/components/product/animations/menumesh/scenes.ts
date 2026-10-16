/**
 * The MenuMesh hero demo as pure functions of scroll (spec §14): where on the page it plays,
 * and what every animated part looks like at a point of that range. No DOM, safe in tests.
 */
import { cubicBezier } from 'motion/react'

import { EASE_IN_OUT } from '@/lib/motion'

/** Scenes in order: scan the table QR, browse the menu, add to cart, the kitchen gets it. */
export const SCENES = ['scan', 'browse', 'cart', 'kitchen'] as const

/** Scroll distance (px) the demo never plays faster than. */
const MIN_RANGE = 240

/**
 * Page-scroll range (px) over which the demo plays, from the element's page offset and height.
 * It starts once the element is fully in view, or at the page top for a hero above the fold,
 * so the first frame is what loads; it ends as the element's top reaches the top of the viewport.
 */
export function playRange(top: number, height: number, viewport: number) {
  const start = Math.max(0, top + height - viewport)
  return { start, end: Math.max(start + MIN_RANGE, top) }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Demo progress 0–1 at a page scroll position. */
export const localProgress = (scrollY: number, { start, end }: { start: number; end: number }) =>
  clamp01((scrollY - start) / (end - start))

const ease = cubicBezier(...EASE_IN_OUT)
/** 0 before `a`, 1 after `b`, eased in between (scrubbed both ways, so in-out). */
const ramp = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)))

export type Part =
  | `caption-${number}`
  | 'qr'
  | 'list'
  | `add-${number}`
  | `step-${number}`
  | 'cart'
  | 'cart-order'
  | 'cart-sent'
  | 'ticket'

export type PartStyle = { opacity: number; transform: string }

/** How far the menu scrolls while browsing (em of the phone's text size). */
const BROWSE_EM = 5.5
const FADE = 0.02

/** Opacity and transform of every animated part at progress `t` (0 = the server-rendered still). */
export function frame(t: number): Record<Part, PartStyle> {
  const out: Record<string, PartStyle> = {}

  SCENES.forEach((_, i) => {
    const enter = i === 0 ? 1 : ramp(t, i / 4 - FADE, i / 4 + FADE)
    const leave = i === SCENES.length - 1 ? 0 : ramp(t, (i + 1) / 4 - FADE, (i + 1) / 4 + FADE)
    out[`caption-${i}`] = {
      opacity: enter * (1 - leave),
      transform: `translateY(${(1 - enter) * 0.5 - leave * 0.5}em)`,
    }
  })

  const scanned = ramp(t, 0.14, 0.26)
  out.qr = {
    opacity: 1 - scanned,
    transform: `translate(${-2 * scanned}em, ${scanned}em) scale(${1 - 0.1 * scanned})`,
  }
  out.list = { opacity: 1, transform: `translateY(${-BROWSE_EM * ramp(t, 0.28, 0.46)}em)` }

  // Two dishes are added one after the other; the cart bar follows.
  for (const k of [0, 1]) {
    const added = ramp(t, 0.52 + 0.07 * k, 0.56 + 0.07 * k)
    out[`add-${k}`] = { opacity: 1 - added, transform: `scale(${1 - 0.15 * added})` }
    out[`step-${k}`] = { opacity: added, transform: `scale(${0.85 + 0.15 * added})` }
  }
  const cart = ramp(t, 0.62, 0.7)
  out.cart = { opacity: cart, transform: `translateY(${(1 - cart) * 120}%)` }

  // The order is placed, then lands on the kitchen screen.
  const sent = ramp(t, 0.74, 0.78)
  out['cart-order'] = { opacity: 1 - sent, transform: `translateY(${-0.6 * sent}em)` }
  out['cart-sent'] = { opacity: sent, transform: `translateY(${0.6 * (1 - sent)}em)` }
  const ticket = ramp(t, 0.77, 0.9)
  out.ticket = {
    opacity: ticket,
    transform: `translateX(${(1 - ticket) * 3}em) scale(${0.94 + 0.06 * ticket})`,
  }

  return out as Record<Part, PartStyle>
}

/**
 * An illustrative QR code (21×21 modules, not scannable): three finder patterns and a fixed
 * pseudo-random fill, as one SVG path of horizontal runs. Deterministic, so server and client
 * render the same markup.
 */
export const QR_PATH = (() => {
  const n = 21
  const finder = (x: number, y: number) => {
    for (const [ox, oy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ] as const) {
      const dx = x - ox
      const dy = y - oy
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
        return ring === 3 || ring <= 1
      }
    }
    return null
  }
  const dark = (x: number, y: number) => finder(x, y) ?? (x * 7 + y * 13 + x * y * 3) % 5 < 2
  let d = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n;) {
      if (!dark(x, y)) {
        x++
        continue
      }
      let run = 1
      while (x + run < n && dark(x + run, y)) run++
      d += `M${x} ${y}h${run}v1h-${run}z`
      x += run
    }
  }
  return d
})()
