'use client'

import { LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

const loadFeatures = () => import('./features').then((mod) => mod.default)

/**
 * Loads Motion's DOM animation features after hydration (use `m.*` from 'motion/react-m', not
 * `motion.*`, to keep the initial bundle small; spec §15) and honours `prefers-reduced-motion`
 * for every animation. Content renders in its final state until then, so nothing waits on it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
