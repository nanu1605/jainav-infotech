'use client'

import { useInView, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import type { Media } from '@/payload-types'

const urlOf = (file: Media | string | null | undefined) =>
  (typeof file === 'string' ? file : file?.url) ?? undefined

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

export type VideoLoopProps = {
  src: Media | string
  poster?: Media | string | null
  /** Describes what the loop shows. Without it the loop is decorative and hidden from screen readers. */
  label?: string
  /** WebVTT captions in the page's language. */
  captions?: Media | string | null
  /** Size the wrapper (e.g. `aspect-video rounded-lg`); the video covers it. */
  className?: string
}

/**
 * Muted loop that plays only while on screen and the tab is visible. Under reduced motion it
 * shows the poster and waits for the play button. The pause/play button is always there
 * (WCAG 2.2.2), and a visitor's choice sticks.
 */
export function VideoLoop({ src, poster, label, captions, className }: VideoLoopProps) {
  const t = useTranslations('ui.video')
  const locale = useLocale()
  const ref = useRef<HTMLVideoElement>(null)
  const inView = useInView(ref, { amount: 0.25 })
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
    () => false,
  )
  const reduceMotion = useReducedMotion()
  const [choice, setChoice] = useState<'play' | 'pause' | null>(null)
  // Follows the element's own events, so the label is right even if the browser blocks play().
  const [playing, setPlaying] = useState(false)
  // A Media doc without a file yet: show the poster only (play() would wait forever).
  const url = urlOf(src)

  useEffect(() => {
    const video = ref.current
    if (!video || !url) return
    const wanted = choice ? choice === 'play' : !reduceMotion
    if (wanted && inView && visible) video.play().catch(() => {})
    else video.pause()
  }, [url, choice, reduceMotion, inView, visible])

  const toggle = () => {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      setChoice('play')
      // Called inside the click so browsers that need a user gesture allow it.
      video.play().catch(() => {})
    } else {
      setChoice('pause')
      video.pause()
    }
  }

  const captionsUrl = urlOf(captions)
  return (
    <div className={cn('relative overflow-hidden bg-bg-subtle', className)}>
      <video
        ref={ref}
        src={url}
        poster={urlOf(poster)}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden={label ? undefined : true}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-cover"
      >
        {captionsUrl && (
          <track kind="captions" src={captionsUrl} srcLang={locale} label={t('captions')} default />
        )}
      </video>
      {url && (
        <IconButton
          label={playing ? t('pause') : t('play')}
          variant="secondary"
          size="sm"
          onClick={toggle}
          className="absolute end-3 bottom-3 bg-surface/90 backdrop-blur-sm"
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </IconButton>
      )}
    </div>
  )
}
