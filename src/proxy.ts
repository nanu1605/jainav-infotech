import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Skip Payload (/admin, /api), tracked redirects (/go), feeds, share images, Next internals and
  // the root metadata files. Not every dotted path: a blog tag like "node.js" is a page. Files
  // added to public/ later must be listed here.
  matcher: [
    '/((?!(?:admin|api|go|feeds|og|_next|_vercel)(?:/|$)|(?:robots\\.txt|sitemap\\.xml|favicon\\.ico)$).*)',
  ],
}
