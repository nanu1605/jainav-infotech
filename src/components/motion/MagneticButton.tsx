'use client'

import { useSpring } from 'motion/react'
import * as m from 'motion/react-m'
import type { PointerEvent } from 'react'

import { Button, type ButtonProps } from '@/components/ui/Button'

import { POINTER_SPRING, pointerRatio, usePointerEffect } from './Tilt'

/** Furthest the button moves toward the cursor, in pixels. */
const PULL = 8

/** Offset toward the pointer, at most PULL pixels in any direction (corners included). */
export const magneticPull = ({ x, y }: { x: number; y: number }) => {
  const scale = PULL / Math.max(1, Math.hypot(x, y))
  return { x: x * scale, y: y * scale }
}

const MotionButton = m.create(Button)

// Motion uses these event names for its own callbacks, so a motion component can't take React's.
type Props = Omit<ButtonProps, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'>

/**
 * Primary call-to-action that leans toward the cursor (spec §14) and springs back on leave.
 * Takes Button's props. Mouse on a fine pointer only; with reduced motion it stays put.
 */
export function MagneticButton({
  style,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: Props) {
  const { active, enter } = usePointerEffect()
  const x = useSpring(0, POINTER_SPRING)
  const y = useSpring(0, POINTER_SPRING)

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e)
    if (!active.current || props.disabled) return
    const box = e.currentTarget.getBoundingClientRect()
    // Measure from the resting position, not the already-pulled one, so the pull doesn't feed back.
    const pull = magneticPull(
      pointerRatio(e.clientX, e.clientY, {
        left: box.left - x.get(),
        top: box.top - y.get(),
        width: box.width,
        height: box.height,
      }),
    )
    x.set(pull.x)
    y.set(pull.y)
  }

  return (
    <MotionButton
      {...props}
      style={{ ...style, x, y }}
      onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(e)
        enter(e)
      }}
      onPointerMove={move}
      onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerLeave?.(e)
        x.set(0)
        y.set(0)
      }}
    />
  )
}
