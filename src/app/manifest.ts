import type { MetadataRoute } from 'next'

import { tokens } from '@/styles/tokens.generated'

/** Web app manifest: names and icons for "Add to home screen" (icons from `pnpm brand:assets`). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jainav Infotech',
    short_name: 'Jainav',
    start_url: '/',
    display: 'browser',
    background_color: tokens.light.bg,
    theme_color: tokens.light.bg,
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
