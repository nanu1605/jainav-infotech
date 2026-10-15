import type { TextFieldSingleValidation } from 'payload'
import { text as validateText } from 'payload/shared'

/** Hosts the Embed block may frame. The CSP frame-src (Phase 6) is built from this list. */
export const EMBED_ALLOWED_HOSTS: readonly string[] = [
  'www.youtube-nocookie.com',
  'www.youtube.com',
  'player.vimeo.com',
  'www.loom.com',
  'cal.com',
  'calendly.com',
]

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
