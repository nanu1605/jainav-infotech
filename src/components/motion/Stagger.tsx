'use client'

import { stagger, type Variants } from 'motion/react'
import { useRef, type ReactNode } from 'react'

import { REVEAL } from '@/lib/motion'

import { MOTION_TAGS, revealTarget, revealTransition, revealVariants, useReveal } from './Reveal'

const parentVariants: Variants = {
  shown: { transition: { delayChildren: stagger(REVEAL.stagger) } },
}

type Props = { as?: keyof typeof MOTION_TAGS; className?: string; children: ReactNode }

/** Reveals its `StaggerItem` children one after another when the group scrolls into view. */
export function Stagger({ as = 'div', className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const phase = useReveal(ref)
  const Comp = MOTION_TAGS[as]
  return (
    <Comp
      ref={ref}
      initial={false}
      animate={revealTarget(phase)}
      variants={parentVariants}
      className={className}
    >
      {children}
    </Comp>
  )
}

export function StaggerItem({ as = 'div', className, children }: Props) {
  const Comp = MOTION_TAGS[as]
  return (
    <Comp variants={revealVariants} transition={revealTransition} data-reveal className={className}>
      {children}
    </Comp>
  )
}
