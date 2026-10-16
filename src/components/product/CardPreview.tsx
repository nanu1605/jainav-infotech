'use client'

import { useEffect, useRef } from 'react'

import { FINE_POINTER } from '@/lib/motion'

type Player = Pick<HTMLVideoElement, 'play' | 'pause' | 'currentTime' | 'ended'>

/** Touch previews start on their own, so they stop before 5 s (WCAG 2.2.2); timeupdate is ~4 Hz. */
export const TOUCH_LIMIT_S = 4.75

// One preview plays at a time across the page (spec §14). `inView` holds the touch-mode cards that
// are at least 60% visible, newest last; the newest one plays.
let current: Player | null = null
const inView: Player[] = []
let listening = false

function start(video: Player) {
  if (current === video) return
  current?.pause()
  current = video
  video.currentTime = 0
  // play() rejects when a pause() interrupts it; nothing to do then.
  if (!document.hidden) video.play().catch(() => {})
}

function stop(video: Player) {
  if (current !== video) return
  video.pause()
  current = null
}

/** Mouse mode: plays while the pointer is over the card. */
export function hoverPreview(video: Player, over: boolean) {
  if (over) start(video)
  else stop(video)
}

/** Touch mode: the newest card at least 60% in view plays; leaving hands over to the previous. */
export function viewPreview(video: Player, visible: boolean) {
  const i = inView.indexOf(video)
  if (i >= 0) inView.splice(i, 1)
  if (visible) inView.push(video)
  const next = inView.at(-1)
  if (next) start(next)
  else if (current) stop(current)
}

/** Touch mode: stops the clip at its end or at TOUCH_LIMIT_S; scrolling it back in replays it. */
export function limitPreview(video: Player) {
  if (video.ended || video.currentTime >= TOUCH_LIMIT_S) stop(video)
}

function pauseWhenHidden() {
  if (listening) return
  listening = true
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) current?.pause()
    else current?.play().catch(() => {})
  })
}

const saveData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true

/**
 * Muted preview over the product card's top area. It loops while a mouse hovers the card; in touch
 * mode it plays once, for at most TOUCH_LIMIT_S, whenever its card becomes the one in view. Must
 * be a direct child of the card (it listens on its parent). Loads nothing until it first plays
 * (`preload="none"`, invisible until `playing`), so the logo underneath is the still frame. Never
 * plays with reduced motion or Save-Data. Absolutely positioned: no layout shift.
 */
export function CardPreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    const card = video?.parentElement
    if (!video || !card || saveData() || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    video.muted = true // React sets `muted` as a property only; iOS checks it before play().
    pauseWhenHidden()

    if (matchMedia(FINE_POINTER).matches) {
      const enter = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') hoverPreview(video, true)
      }
      const leave = () => hoverPreview(video, false)
      card.addEventListener('pointerenter', enter)
      card.addEventListener('pointerleave', leave)
      return () => {
        card.removeEventListener('pointerenter', enter)
        card.removeEventListener('pointerleave', leave)
        leave()
      }
    }

    video.loop = false
    const limit = () => limitPreview(video)
    video.addEventListener('timeupdate', limit)
    video.addEventListener('ended', limit)
    // A delayed callback can batch several changes: the last entry is the current one.
    const io = new IntersectionObserver(
      (entries) => viewPreview(video, (entries.at(-1)?.intersectionRatio ?? 0) >= 0.6),
      { threshold: [0, 0.6] },
    )
    io.observe(card)
    return () => {
      io.disconnect()
      video.removeEventListener('timeupdate', limit)
      video.removeEventListener('ended', limit)
      viewPreview(video, false)
    }
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden
      tabIndex={-1}
      onPlaying={(e) => (e.currentTarget.style.opacity = '1')}
      onPause={(e) => (e.currentTarget.style.opacity = '0')}
      className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full object-cover opacity-0 transition-opacity duration-(--duration-slow) ease-out mask-b-from-50%"
    />
  )
}
