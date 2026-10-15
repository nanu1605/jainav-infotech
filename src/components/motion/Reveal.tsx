'use client'

import { useReducedMotion, type Transition, type Variants } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { EASE_OUT, REVEAL } from '@/lib/motion'

export type RevealPhase = 'static' | 'hidden' | 'shown'

/**
 * Entrance state for scroll reveals (spec §14). Content renders visible on the server, so it is
 * in the DOM for SEO and readable without JavaScript. After hydration only content that starts
 * below the fold is hidden (`hidden`) and then revealed when it scrolls into view (`shown`).
 * Anything already on screen stays `static`, so the LCP element is never hidden or delayed.
 * With reduced motion everything stays `static`: entrances are non-essential (spec §20).
 */
export function useReveal(ref: RefObject<Element | null>): RevealPhase {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<RevealPhase>('static')
  useEffect(() => {
    const el = ref.current
    if (reduce || !el || el.getBoundingClientRect().top < window.innerHeight) return
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry?.isIntersecting
        setPhase(visible ? 'shown' : 'hidden')
        if (visible) io.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, reduce])
  return reduce ? 'static' : phase
}

/** Variant label for `animate`: `static` renders the final state without animating. */
export const revealTarget = (phase: RevealPhase) => (phase === 'hidden' ? 'hidden' : 'shown')

/** Fade + rise. Hiding is instant (it only happens off screen); the reveal uses the tokens. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: REVEAL.rise, transition: { duration: 0 } },
  shown: { opacity: 1, y: 0 },
}

// No `delay` key: a stagger parent supplies each child's delay, and an own delay would override it.
export const revealTransition: Transition = { duration: REVEAL.duration, ease: EASE_OUT }

// `as` changes the element only; Motion's per-tag component types differ just in their ref type.
export const MOTION_TAGS = {
  div: m.div,
  section: m.section,
  article: m.article,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
} as unknown as Record<'div' | 'section' | 'article' | 'ul' | 'ol' | 'li', typeof m.div>

type RevealProps = {
  as?: keyof typeof MOTION_TAGS
  /** Seconds before this element starts revealing, for hand-sequenced groups. */
  delay?: number
  className?: string
  children: ReactNode
}

/** Fades and rises its content in the first time it scrolls into view. */
export function Reveal({ as = 'div', delay = 0, className, children }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const phase = useReveal(ref)
  const Comp = MOTION_TAGS[as]
  return (
    <Comp
      ref={ref}
      initial={false}
      animate={revealTarget(phase)}
      variants={revealVariants}
      transition={{ ...revealTransition, delay }}
      data-reveal
      className={className}
    >
      {children}
    </Comp>
  )
}
