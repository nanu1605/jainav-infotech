import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Skip Payload (/admin, /api), tracked redirects (/go), feeds, Next internals and files.
  matcher: ['/((?!(?:admin|api|go|feeds|_next|_vercel)(?:/|$)|.*\\..*).*)'],
}
