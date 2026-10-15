import Image, { type ImageProps } from 'next/image'

import type { Media } from '@/payload-types'

type Source =
  /** A Payload upload: alt, size and focal point come from the document. */
  | { media: Media; src?: never; alt?: string; width?: never; height?: never }
  | { media?: never; src: ImageProps['src']; alt: string; width?: number; height?: number }

export type ResponsiveImageProps = Omit<
  ImageProps,
  'src' | 'alt' | 'width' | 'height' | 'priority' | 'preload'
> &
  Source & {
    /** Purely decorative: renders `alt=""`. Every other image needs real alt text. */
    decorative?: boolean
    /** The page's LCP image: preloaded and fetched with high priority. */
    priority?: boolean
  }

/**
 * next/image for CMS media and static files. Pass `sizes` with `fill` or fluid widths; with
 * `fill`, the parent needs a size and `position: relative`. The media's focal point becomes
 * `object-position`, so `object-cover` crops around it.
 */
export function ResponsiveImage({
  media,
  src,
  alt,
  width,
  height,
  decorative = false,
  priority = false,
  fill,
  unoptimized,
  fetchPriority,
  style,
  ...props
}: ResponsiveImageProps) {
  const text = decorative ? '' : (alt ?? media?.alt ?? '')
  if (!decorative && !text && process.env.NODE_ENV !== 'production') {
    console.error(
      'ResponsiveImage: missing alt text. Pass alt, or decorative for decorative images.',
    )
  }
  const url = media ? media.url : src
  if (!url) return null

  const focal =
    media?.focalX != null && media.focalY != null ? `${media.focalX}% ${media.focalY}%` : undefined

  return (
    <Image
      src={url}
      alt={text}
      fill={fill}
      width={fill ? undefined : (media?.width ?? width)}
      height={fill ? undefined : (media?.height ?? height)}
      // SVG can't go through the optimizer; URLs ending in .svg are skipped by Next itself.
      unoptimized={unoptimized || media?.mimeType === 'image/svg+xml'}
      preload={priority}
      fetchPriority={priority ? 'high' : fetchPriority}
      style={{ objectPosition: focal, ...style }}
      {...props}
    />
  )
}
