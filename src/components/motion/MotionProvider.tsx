'use client'

import { LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

const loadFeatures = () => import('./features').then((mod) => mod.default)

/**
 * Wrap a component that animates with Motion (`m.*` from 'motion/react-m', never `motion.*`):
 * loads Motion's DOM features lazily and honours `prefers-reduced-motion`. Used per component,
 * not in the layout, so pages without Motion animations ship none of it (spec §15).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
