'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Dialog } from 'radix-ui'

import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { IconButton } from '@/components/ui/IconButton'
import type { Media } from '@/payload-types'

type LightboxProps = {
  images: Media[]
  index: number
  open: boolean
  onIndexChange: (index: number) => void
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
}

/**
 * Full-screen image viewer for Gallery (lazy-loaded). Always dark, whatever the page theme.
 * Keys: ← → step through images, Escape closes (Radix traps and restores focus).
 */
export function Lightbox({
  images,
  index,
  open,
  onIndexChange,
  onOpenChange,
  onCloseAutoFocus,
}: LightboxProps) {
  const t = useTranslations('ui.lightbox')
  const total = images.length
  const image = images[index]
  if (!image) return null
  const go = (step: number) => onIndexChange((index + step + total) % total)
  const caption = image.caption

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-theme="dark"
          className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm transition-opacity duration-[var(--duration-base)] ease-out starting:opacity-0"
        />
        <Dialog.Content
          data-theme="dark"
          aria-describedby={undefined}
          onCloseAutoFocus={onCloseAutoFocus}
          onKeyDown={(event) => {
            if (total < 2) return
            if (event.key === 'ArrowLeft') go(-1)
            else if (event.key === 'ArrowRight') go(1)
          }}
          className="fixed inset-0 z-50 flex flex-col gap-3 p-3 text-fg outline-none sm:gap-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="sr-only">{t('title')}</Dialog.Title>
            <p aria-hidden className="ps-2 text-sm text-fg-muted tabular-nums">
              {total > 1 && `${index + 1} / ${total}`}
            </p>
            <Dialog.Close asChild>
              <IconButton label={t('close')} variant="secondary">
                <X aria-hidden />
              </IconButton>
            </Dialog.Close>
          </div>

          <figure className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative min-h-0 flex-1">
              <ResponsiveImage
                // Remount per image so each one fades in.
                key={image.id}
                media={image}
                fill
                sizes="100vw"
                className="object-contain transition-opacity duration-[var(--duration-base)] ease-out starting:opacity-0"
                style={{ objectPosition: 'center' }}
              />
              {total > 1 && (
                <>
                  <IconButton
                    label={t('previous')}
                    variant="secondary"
                    size="lg"
                    onClick={() => go(-1)}
                    className="absolute start-0 top-1/2 -translate-y-1/2 rounded-full sm:start-2"
                  >
                    <ChevronLeft aria-hidden />
                  </IconButton>
                  <IconButton
                    label={t('next')}
                    variant="secondary"
                    size="lg"
                    onClick={() => go(1)}
                    className="absolute end-0 top-1/2 -translate-y-1/2 rounded-full sm:end-2"
                  >
                    <ChevronRight aria-hidden />
                  </IconButton>
                </>
              )}
            </div>
            {caption && (
              <figcaption className="mx-auto max-w-prose text-center text-sm text-fg-muted">
                {caption}
              </figcaption>
            )}
          </figure>

          {/* Announces the position and the new image after ← / → or the buttons. */}
          <div aria-live="polite" aria-atomic className="sr-only">
            {total > 1 && <p>{t('counter', { current: index + 1, total })}</p>}
            <p>{image.alt}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
