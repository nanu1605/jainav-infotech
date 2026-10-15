import type { HiPatch } from './content'

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Builds the Hindi update for a just-created English document. Array and block rows are
 * matched by index and keep their English row (id, blockType, non-localized fields), because
 * Payload matches localized rows by id; rows without an id would replace the English ones.
 * At the top level only the patched fields are sent, so everything else keeps its value.
 */
export function withHindi(en: unknown, patch: HiPatch | HiPatch[] | string, root = true): unknown {
  if (typeof patch === 'string') return patch
  if (Array.isArray(patch)) {
    const rows = Array.isArray(en) ? en : []
    return patch.map((row, i) => withHindi(rows[i], row, false))
  }
  const out: Record<string, unknown> = root || !isObject(en) ? {} : { ...en }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    out[key] = withHindi(isObject(en) ? en[key] : undefined, value, false)
  }
  return out
}
