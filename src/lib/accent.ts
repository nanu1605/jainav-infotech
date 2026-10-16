/**
 * Product accent colors (spec §5.3). Accents come from the CMS as #RRGGBB, so the text color on
 * an accent surface is chosen here to meet contrast, and accents too faint against the page are
 * used only decoratively. Pure functions: safe on the server and in tests.
 */
import { tokens } from '@/styles/tokens.generated'

const channel = (hex: string, i: number) => {
  const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)

/** WCAG contrast ratio of two #RRGGBB colors. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const isHex = (value: string | null | undefined): value is string =>
  !!value && /^#[0-9a-f]{6}$/i.test(value)

/**
 * CSS variables for a product surface: `--product-accent`, `--product-accent-fg` (light or dark
 * text, whichever contrasts more) and `--product-accent-text` (the accent when it reaches 3:1 on
 * the page in both themes, otherwise the regular text color).
 */
export function accentVars(accent: string | null | undefined): Record<string, string> {
  if (!isHex(accent)) return {}
  const light = tokens.light['fg-inverse']
  const dark = tokens.light.fg
  const fg = contrast(accent, light) >= contrast(accent, dark) ? light : dark
  const readable = contrast(accent, tokens.light.bg) >= 3 && contrast(accent, tokens.dark.bg) >= 3
  return {
    '--product-accent': accent,
    '--product-accent-fg': fg,
    '--product-accent-text': readable ? accent : 'var(--fg)',
  }
}
