import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

import { securityHeaders } from './src/lib/csp'

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
    return [{ source: '/:path*', headers: securityHeaders(env) }]
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
