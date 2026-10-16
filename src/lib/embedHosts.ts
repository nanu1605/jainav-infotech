/** Hosts the Embed block may frame; the CSP's frame-src is built from this list (src/lib/csp.ts). */
export const EMBED_ALLOWED_HOSTS: readonly string[] = [
  'www.youtube-nocookie.com',
  'www.youtube.com',
  'player.vimeo.com',
  'www.loom.com',
  'cal.com',
  'calendly.com',
]
