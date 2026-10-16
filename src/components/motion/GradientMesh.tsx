'use client'

import { useEffect, useRef } from 'react'

import { FINE_POINTER } from '@/lib/motion'

import { pointerRatio } from './Tilt'

/** Extra blobs: soft radial fills built from tokens (no blur filter needed). */
const GLOW = 'radial-gradient(closest-side, var(--glow), transparent)'
const ACCENT =
  'radial-gradient(closest-side, color-mix(in oklch, var(--brand-accent) 25%, transparent), transparent)'

/**
 * Animated gradient mesh behind a hero (spec §14). Place it as the first child of a
 * `relative isolate overflow-hidden` section: it fills the section and listens to its pointer.
 *
 * The server HTML is the still frame (the base gradient and the original top glow at rest), so
 * first paint never waits for JS. Blobs drift with CSS keyframes on `transform` and lean toward a
 * fine mouse pointer on `translate` (custom properties set here; `.mesh-blob` in globals.css).
 * The drift pauses off-screen and in hidden tabs; with reduced motion nothing moves.
 */
export function GradientMesh() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mesh = ref.current
    const host = mesh?.parentElement
    if (!mesh || !host) return
    const set = (name: string, value: string) => mesh.style.setProperty(name, value)

    let onScreen = true
    const play = () => set('--mesh-play', onScreen && !document.hidden ? 'running' : 'paused')
    const io = new IntersectionObserver((entries) => {
      onScreen = entries.at(-1)?.isIntersecting ?? onScreen
      play()
    })
    io.observe(mesh)
    document.addEventListener('visibilitychange', play)

    const fine = matchMedia(FINE_POINTER)
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !fine.matches || still.matches) return
      const { x, y } = pointerRatio(e.clientX, e.clientY, host.getBoundingClientRect())
      set('--mesh-x', x.toFixed(3))
      set('--mesh-y', y.toFixed(3))
    }
    const leave = () => {
      set('--mesh-x', '0')
      set('--mesh-y', '0')
    }
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', leave)

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', play)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-(image:--gradient-3)" />
      {/* Blobs fade out toward the bottom, so the hero never ends on a cut-off tint. */}
      <div className="absolute inset-0 mask-b-from-50%">
        <div className="mesh-blob absolute -top-40 left-1/2 h-[36rem] w-[64rem] max-w-none rounded-full bg-(image:--gradient-1) opacity-20 blur-3xl [--drift:26s] [--pull:3rem] [--tx:-50%] dark:opacity-25" />
        <div
          className="mesh-blob absolute top-0 -right-56 size-[40rem] rounded-full opacity-60 [--drift:34s] [--pull:-2rem] [animation-direction:reverse] dark:opacity-40"
          style={{ backgroundImage: GLOW }}
        />
        <div
          className="mesh-blob absolute top-[15%] -left-48 size-[34rem] rounded-full [--drift:41s] [--pull:4rem]"
          style={{ backgroundImage: ACCENT }}
        />
      </div>
    </div>
  )
}
