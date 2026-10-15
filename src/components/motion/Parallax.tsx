'use client'

import { useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import * as m from 'motion/react-m'
import { useRef, type ReactNode } from 'react'

type Props = {
  /** Pixels the content drifts each way while it crosses the viewport (down below, up above). */
  offset?: number
  className?: string
  children?: ReactNode
}

/**
 * Scroll-linked vertical drift (transform only). The offset starts at 0 and is applied only after
 * mount, so server and client render the same markup and reduced motion keeps it at 0.
 */
export function Parallax({ offset = 40, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const y = useMotionValue(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    y.set(reduce ? 0 : offset * (1 - 2 * progress))
  })
  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  )
}
