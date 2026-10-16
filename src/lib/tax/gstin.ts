import { isStateCode, type StateCode } from './states'

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
// State code, PAN (5 letters, 4 digits, 1 letter), entity number, "Z", check character.
const SHAPE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** The GSTIN check character: weights 1, 2, 1, 2… over the first 14 characters, modulo 36. */
export function gstinCheckChar(first14: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14[i]!) * (i % 2 ? 2 : 1)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return CHARS[(36 - (sum % 36)) % 36]!
}

export const normalizeGstin = (value: string) => value.replace(/\s+/g, '').toUpperCase()

/**
 * The place of supply a valid GSTIN locks (spec §11.4): its state, or null when the GSTIN is
 * malformed, fails its checksum or names no known state.
 */
export function gstinState(value: string): StateCode | null {
  const gstin = normalizeGstin(value)
  if (!SHAPE.test(gstin) || gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) return null
  const code = gstin.slice(0, 2)
  return isStateCode(code) ? code : null
}
