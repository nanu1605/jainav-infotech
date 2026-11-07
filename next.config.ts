import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

import { contentSecurityPolicy, securityHeaders } from './src/lib/csp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
// Media URLs point at the R2 CDN in staging and production (payload.config.ts generateFileURL).
const cdn = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, '')

// Messages are compiled at build time, so the ICU parser stays out of the client bundle (§15).
const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/i18n/request.ts',
  experimental: {
    messages: { path: './messages', format: 'json', locales: 'infer', precompile: true },
  },
})

const nextConfig: NextConfig = {
  // The Docker image runs the traced standalone server (docker/Dockerfile sets NEXT_OUTPUT);
  // local `pnpm start` and Lighthouse runs keep `next start`, which standalone output disables.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // next dev would otherwise add an AGENTS.md to the repository when a coding agent starts it.
  agentRules: false,
  experimental: {
    // Would stop next dev and next build under a coding agent until a patched Next is installed,
    // even while the fix waits out the two-week rule (docs/decisions.md).
    agentUpgrade: false,
    // 16.4's route prediction and next-intl's unprefixed English paths can refetch a link's
    // prefetch endlessly (vercel/next.js#100431): 4,000 requests in 8 s on a build with a
    // database. The image builds without one and doesn't loop. Dev can't show this.
    // Drop it once #100464 ships.
    optimisticRouting: false,
  },
  // Turbopack on Windows can't resolve Payload's Sass imports without this.
  // See https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  // Development keeps Next's defaults: its dev tooling needs eval, which the CSP blocks.
  async headers() {
    if (process.env.NODE_ENV !== 'production') return []
    const env = {
      cdnUrl: process.env.NEXT_PUBLIC_CDN_URL,
      umamiUrl: process.env.NEXT_PUBLIC_UMAMI_URL,
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }
    return [
      { source: '/:path*', headers: securityHeaders(env) },
      // Later entries win for the same header: the admin also allows Payload's Monaco editor.
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy(env, { admin: true }) },
        ],
      },
    ]
  },
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
    remotePatterns: cdn ? [new URL(`${cdn}/**`)] : [],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
