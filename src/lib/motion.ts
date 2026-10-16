/**
 * Motion timings shared by every animation (spec §14). Mirrors the motion tokens in
 * src/styles/brand.config.ts, which feed the CSS side (`ease-out`, `--duration-*`).
 */
import { brandConfig } from '@/styles/brand.config'

type Bezier = [number, number, number, number]

const bezier = (css: string): Bezier => {
  const values = css
    .match(/cubic-bezier\(([^)]+)\)/)?.[1]
    ?.split(',')
    .map(Number)
  if (values?.length !== 4 || values.some(Number.isNaN))
    throw new Error(`Not a cubic-bezier: ${css}`)
  return values as Bezier
}
const seconds = (css: string) => Number.parseFloat(css) / 1000

export const EASE_OUT = bezier(brandConfig.motion['ease-out'])
export const EASE_IN_OUT = bezier(brandConfig.motion['ease-in-out'])

export const DURATION = {
  fast: seconds(brandConfig.motion['duration-fast']),
  base: seconds(brandConfig.motion['duration-base']),
  slow: seconds(brandConfig.motion['duration-slow']),
} as const

/** Pointer effects only where a precise pointer can hover (never on touch). */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'
