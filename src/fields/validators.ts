import type { NumberFieldSingleValidation, TextFieldSingleValidation } from 'payload'
import { number as validateNumber, text as validateText } from 'payload/shared'
import { valid as validSemver } from 'semver'

// A custom `validate` replaces Payload's built-in one, so each validator chains it at the end
// to keep `required`, min/max and length checks.

export const hexColor: TextFieldSingleValidation = (value, options) =>
  value && !/^#[0-9a-f]{6}$/i.test(value)
    ? 'Use a 6-digit hex color like #RRGGBB'
    : validateText(value, options)

/** Money and counts are stored as integers in the smallest unit (spec §3). */
export const integer: NumberFieldSingleValidation = (value, options) =>
  value != null && !Number.isInteger(value)
    ? 'Must be a whole number'
    : validateNumber(value, options)

export const semver: TextFieldSingleValidation = (value, options) =>
  value && validSemver(value) !== value
    ? 'Use a semantic version without a "v" prefix, e.g. 1.4.0 or 2.0.0-beta.1'
    : validateText(value, options)

/** Absolute http(s) URL. */
export const httpUrl: TextFieldSingleValidation = (value, options) => {
  if (value) {
    try {
      const { protocol } = new URL(value)
      if (protocol !== 'https:' && protocol !== 'http:') return 'Use an http(s) URL'
    } catch {
      return 'Use a full URL, e.g. https://example.com'
    }
  }
  return validateText(value, options)
}

/** Site-relative path (/about) or absolute http(s) / mailto: / tel: link. */
export const href: TextFieldSingleValidation = (value, options) => {
  if (value && !/^(\/(?!\/)|https?:\/\/|mailto:|tel:)/.test(value)) {
    return 'Start with / for site pages, or use https://, mailto: or tel:'
  }
  return validateText(value, options)
}

/** WhatsApp number as wa.me expects it: digits only, country code first (spec §8.1). */
export const whatsappNumber: TextFieldSingleValidation = (value, options) =>
  value && !/^[1-9]\d{9,14}$/.test(value)
    ? 'Digits only, starting with the country code, e.g. 919876543210'
    : validateText(value, options)

/** YYYY-MM-DD, used for IST business dates stored as text (spec §3). */
export const isoDate: TextFieldSingleValidation = (value, options) =>
  value && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? 'Use YYYY-MM-DD' : validateText(value, options)
