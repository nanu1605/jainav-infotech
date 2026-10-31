import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// A path that won't decode, or decodes to a % or NUL, can't be a page. Left alone it answers a bare
// 500: next-intl rewrites /a%25b to the undecodable /en/a%b (next-intl issue 2442), and an app-only build
// has no page for the 400 Next answers those with. See docs/decisions.md.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // Next matches routes against the original URL even after a rewrite, so no page can render.
    return new NextResponse('Not Found', { status: 404 })
  }
  if (!/[%\0]/.test(decoded)) return intlMiddleware(request)
  // ponytail: a blog tag or redirect with a literal % 404s too; none exists, and Next can't serve one.
  const locale = routing.locales.find((l) => pathname.startsWith(`/${l}/`)) ?? routing.defaultLocale
  // No page or redirect has this slug, so the catch-all route renders the site's 404.
  return NextResponse.rewrite(new URL(`/${locale}/malformed-path`, request.url))
}

export const config = {
  // Skip Payload (/admin, /api), tracked redirects (/go), feeds, share images, Next internals and
  // the root metadata files. Not every dotted path: a blog tag like "node.js" is a page. Files
  // added to public/ later must be listed here.
  matcher: [
    '/((?!(?:admin|api|go|feeds|og|_next|_vercel)(?:/|$)|(?:robots\\.txt|sitemap\\.xml|favicon\\.ico)$).*)',
  ],
}
