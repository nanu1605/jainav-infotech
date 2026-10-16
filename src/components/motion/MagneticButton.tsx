'use client'

import { useRef, type PointerEvent } from 'react'

import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

import { pointerRatio, usePointerEffect } from './Tilt'

/** Furthest the button moves toward the cursor, in pixels. */
const PULL = 8

/** Offset toward the pointer, at most PULL pixels in any direction (corners included). */
export const magneticPull = ({ x, y }: { x: number; y: number }) => {
  const scale = PULL / Math.max(1, Math.hypot(x, y))
  return { x: x * scale, y: y * scale }
}

/**
 * Primary call-to-action that leans toward the cursor (spec §14) and eases back on leave. Takes
 * Button's props (asChild included). Mouse on a fine pointer only; with reduced motion it stays
 * put. A CSS `translate` transition on the motion tokens: no animation library on the page.
 */
export function MagneticButton({
  className,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: ButtonProps) {
  const { active, enter } = usePointerEffect()
  const pull = useRef({ x: 0, y: 0 })

  const set = (el: HTMLElement, x: number, y: number) => {
    pull.current = { x, y }
    el.style.translate = x || y ? `${x}px ${y}px` : ''
  }

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e)
    if (!active.current || props.disabled) return
    const box = e.currentTarget.getBoundingClientRect()
    // Measure from the resting position, not the already-pulled one, so the pull doesn't feed back.
    const next = magneticPull(
      pointerRatio(e.clientX, e.clientY, {
        left: box.left - pull.current.x,
        top: box.top - pull.current.y,
        width: box.width,
        height: box.height,
      }),
    )
    set(e.currentTarget, next.x, next.y)
  }

  return (
    <Button
      {...props}
      className={cn(
        'transition-[background-color,color,border-color,box-shadow,opacity,translate] duration-(--duration-base)',
        className,
      )}
      onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(e)
        enter(e)
      }}
      onPointerMove={move}
      onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerLeave?.(e)
        set(e.currentTarget, 0, 0)
      }}
    />
  )
}
