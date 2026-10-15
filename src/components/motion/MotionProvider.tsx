'use client'

import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Loads Motion's DOM animation features once (use `m.*` from 'motion/react-m', not `motion.*`,
 * to keep the initial bundle small) and honours `prefers-reduced-motion` for every animation.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
