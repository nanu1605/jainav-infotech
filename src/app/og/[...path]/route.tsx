import { getTranslations } from 'next-intl/server'

import { isPreview } from '@/lib/cms'
import { ogImage } from '@/lib/og'
import { getPost, getProduct } from '@/lib/queries'

/**
 * Share images (spec §15): /og/site.png, /og/products/{slug}.png, /og/blog/{slug}.png. Always
 * English: Satori can't shape Devanagari, so Hindi pages share them (spec §6). The .png path
 * keeps the locale proxy out and lets the CDN cache them.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/')
  const match = /^(?:site|(products|blog)\/([a-z0-9-]{1,80}))\.png$/.exec(path)
  if (!match) return new Response('Not found', { status: 404 })
  const [, kind, slug] = match

  let image: Response | null = null
  if (!kind) {
    const t = await getTranslations({ locale: 'en', namespace: 'metadata' })
    image = ogImage({ title: t('title') })
  } else if (kind === 'products') {
    const product = await getProduct('en', slug!)
    if (product) {
      image = ogImage({
        title: product.name,
        eyebrow: product.tagline,
        accent: product.accentColor,
      })
    }
  } else {
    const post = await getPost('en', slug!)
    const t = await getTranslations({ locale: 'en', namespace: 'blog' })
    if (post) image = ogImage({ title: post.title ?? '', eyebrow: t('feedTitle') })
  }
  if (!image) return new Response('Not found', { status: 404 })
  // A previewing admin may have rendered drafts: never let a CDN keep that image.
  image.headers.set(
    'Cache-Control',
    (await isPreview()) ? 'private, no-store' : 'public, max-age=3600, s-maxage=86400',
  )
  return image
}
