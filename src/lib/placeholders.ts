import { mapStrings } from './scrub'

/** The `{{LIKE_THIS}}` values (spec §21) still in any text of `value`. */
export const placeholdersIn = (value: unknown): string[] => {
  const json = JSON.stringify(value) ?? ''
  // Formatting can split one across rich text nodes, which then print side by side.
  const nodes = [...json.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)].map(([, text]) => text).join('')
  return [...new Set(`${json} ${nodes}`.match(/\{\{[^{}"]*\}*/g))]
}

/** A copy of `value` with every string that still holds a placeholder blanked. */
export const withoutPlaceholders = <T>(value: T): T =>
  mapStrings(value, (text) => (text.includes('{{') ? null : text))
