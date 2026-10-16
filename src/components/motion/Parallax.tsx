'use client'

import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useRef, type ReactNode } from 'react'

type Props = {
  /** Pixels the content drifts each way while it crosses the viewport (down below, up above). */
  offset?: number
  className?: string
  children?: ReactNode
}

/**
 * Scroll-linked vertical drift (transform only). Server and client render no transform; it is
 * written straight to the element from the first measurement after mount (a Motion component
 * would reset it when the lazy features load), and reduced motion keeps it off.
 */
export function Parallax({ offset = 40, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    if (ref.current)
      ref.current.style.transform = reduce ? '' : `translateY(${offset * (1 - 2 * progress)}px)`
  })
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
