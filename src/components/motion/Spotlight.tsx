'use client'

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { usePointerEffect } from './Tilt'

type Props = {
  /** Highlight color, a CSS value built from tokens. Defaults to the brand glow. */
  color?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Surface with a soft highlight that follows the cursor (spec §14). The highlight is a decorative
 * layer moved with `transform` and faded with `opacity`, painted behind the content. Mouse on a
 * fine pointer only; off with reduced motion.
 */
export function Spotlight({ color = 'var(--glow)', className, style, children }: Props) {
  const { active, enter } = usePointerEffect()
  const layer = useRef<HTMLDivElement>(null)

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!active.current || !layer.current) return
    const box = e.currentTarget.getBoundingClientRect()
    layer.current.style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px)`
    layer.current.style.opacity = '1'
  }
  const leave = () => {
    if (layer.current) layer.current.style.opacity = '0'
  }

  return (
    <div
      className={cn('relative isolate overflow-hidden', className)}
      style={style}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <div
        ref={layer}
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 -z-10 size-80 rounded-full opacity-0 transition-opacity duration-[var(--duration-base)] ease-out"
        style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }}
      />
      {children}
    </div>
  )
}
