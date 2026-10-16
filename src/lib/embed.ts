import type { TextFieldSingleValidation } from 'payload'
import { text as validateText } from 'payload/shared'

import { EMBED_ALLOWED_HOSTS } from './embedHosts'

export { EMBED_ALLOWED_HOSTS }

/** https only, exact host: no subdomains, no non-default port. */
export function isAllowedEmbedUrl(url: string): boolean {
  try {
    const { protocol, host } = new URL(url)
    return protocol === 'https:' && EMBED_ALLOWED_HOSTS.includes(host)
  } catch {
    return false
  }
}

export const embedUrl: TextFieldSingleValidation = (value, options) =>
  value && !isAllowedEmbedUrl(value)
    ? `Use an https:// link from ${EMBED_ALLOWED_HOSTS.join(', ')}`
    : validateText(value, options)
