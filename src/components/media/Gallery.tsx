'use client'

import { Maximize2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'

import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { cn } from '@/lib/cn'
import type { Media } from '@/payload-types'

const Lightbox = dynamic(() => import('./Lightbox').then((mod) => mod.Lightbox), { ssr: false })
const preloadLightbox = () => void import('./Lightbox')

/** Thumbnail grid that opens a lightbox (loaded on first hover, focus or click). */
export function Gallery({ images, className }: { images: Media[]; className?: string }) {
  const t = useTranslations('ui.gallery')
  // null until the first open, so the lightbox code isn't loaded for visitors who never open it.
  const [index, setIndex] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])

  if (!images.length) return null

  return (
    <>
      <ul role="list" className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', className)}>
        {images.map((image, i) => (
          <li key={image.id}>
            <button
              ref={(el) => {
                thumbs.current[i] = el
              }}
              type="button"
              aria-label={t('open', { alt: image.alt ?? '' })}
              aria-haspopup="dialog"
              onPointerEnter={preloadLightbox}
              onFocus={preloadLightbox}
              onClick={() => {
                setIndex(i)
                setOpen(true)
              }}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-bg-subtle"
            >
              <ResponsiveImage
                media={image}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-[var(--duration-slow)] ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
              />
              <span
                aria-hidden
                className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-md bg-surface/90 text-fg opacity-0 shadow-sm transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Maximize2 className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {index !== null && (
        <Lightbox
          images={images}
          index={index}
          open={open}
          onIndexChange={setIndex}
          onOpenChange={setOpen}
          // Return focus to the thumbnail of the image that was showing, not the one first opened.
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            thumbs.current[index]?.focus()
          }}
        />
      )}
    </>
  )
}
