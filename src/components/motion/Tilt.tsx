'use client'

import { useReducedMotion, useSpring } from 'motion/react'
import * as m from 'motion/react-m'
import { useRef, type PointerEvent, type ReactNode } from 'react'

import { DURATION, FINE_POINTER } from '@/lib/motion'

/** Spring for pointer-driven effects; its settle time comes from the motion tokens. */
export const POINTER_SPRING = { visualDuration: DURATION.base, bounce: 0.2 }

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
  const reduce = useReducedMotion()
  const active = useRef(false)
  const enter = (e: PointerEvent) => {
    active.current = !reduce && e.pointerType === 'mouse' && matchMedia(FINE_POINTER).matches
  }
  return { active, enter }
}

type Props = { max?: number; className?: string; children: ReactNode }

/** Tilts toward the pointer in 3D, up to `max` degrees (spec §14: 6°), and settles back on leave. */
export function Tilt({ max = 6, className, children }: Props) {
  const { active, enter } = usePointerEffect()
  const rotateX = useSpring(0, POINTER_SPRING)
  const rotateY = useSpring(0, POINTER_SPRING)

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!active.current) return
    const { x, y } = pointerRatio(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())
    rotateX.set(-y * max)
    rotateY.set(x * max)
  }
  const leave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <m.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </m.div>
  )
}
