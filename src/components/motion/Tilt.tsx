'use client'

import { useRef, type PointerEvent, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { FINE_POINTER } from '@/lib/motion'

type Box = { left: number; top: number; width: number; height: number }

/** Pointer position in a box, per axis from -1 (left/top) through 0 (center) to 1 (right/bottom). */
export function pointerRatio(clientX: number, clientY: number, box: Box) {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  return {
    x: clamp(((clientX - box.left) / box.width) * 2 - 1),
    y: clamp(((clientY - box.top) / box.height) * 2 - 1),
  }
}

/**
 * Pointer effects run only for a mouse on a device whose main pointer can hover precisely, and
 * never with reduced motion. Checked when the pointer enters, so touch never triggers them.
 */
export function usePointerEffect() {
  const active = useRef(false)
  const enter = (e: PointerEvent) => {
    active.current =
      e.pointerType === 'mouse' &&
      matchMedia(FINE_POINTER).matches &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return { active, enter }
}

/**
 * Easing for pointer effects: a CSS transition on the motion tokens rather than a Motion spring,
 * so pointer effects add no animation engine to the page (spec §15 budget).
 */
const POINTER_TRANSITION = 'transition-transform duration-(--duration-base) ease-out'

type Props = { max?: number; className?: string; children: ReactNode }

/** Tilts toward the pointer in 3D, up to `max` degrees (spec §14: 6°), and settles back on leave. */
export function Tilt({ max = 6, className, children }: Props) {
  const { active, enter } = usePointerEffect()
  const ref = useRef<HTMLDivElement>(null)

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!active.current || !ref.current) return
    const { x, y } = pointerRatio(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())
    ref.current.style.transform = `perspective(1000px) rotateX(${-y * max}deg) rotateY(${x * max}deg)`
  }
  const leave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      className={cn(POINTER_TRANSITION, className)}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </div>
  )
}
