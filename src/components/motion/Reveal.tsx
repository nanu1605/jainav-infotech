'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

export type RevealPhase = 'static' | 'hidden' | 'shown'

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Entrance state for scroll reveals (spec §14). Content renders visible on the server, so it is
 * in the DOM for SEO and readable without JavaScript. After hydration only content that starts
 * below the fold is hidden (`hidden`) and then revealed when it scrolls into view (`shown`).
 * Anything already on screen stays `static`, so the LCP element is never hidden or delayed.
 * With reduced motion everything stays `static`: entrances are non-essential (spec §20).
 */
export function useReveal(ref: RefObject<Element | null>): RevealPhase {
  const [phase, setPhase] = useState<RevealPhase>('static')
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || el.getBoundingClientRect().top < window.innerHeight) return
    const io = new IntersectionObserver(
      (entries) => {
        // Entries can be batched: the last one is the current state.
        const visible = !!entries.at(-1)?.isIntersecting
        setPhase(visible ? 'shown' : 'hidden')
        if (visible) io.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return phase
}

export type RevealTag = 'div' | 'section' | 'article' | 'ul' | 'ol' | 'li'

type RevealProps = {
  as?: RevealTag
  /** Seconds before this element starts revealing, for hand-sequenced groups. */
  delay?: number
  className?: string
  children: ReactNode
}

/**
 * Fades and rises its content in the first time it scrolls into view. The animation is CSS
 * (globals.css, `[data-reveal]`) on the motion tokens: no animation library on the page (§15).
 */
export function Reveal({ as = 'div', delay = 0, className, children }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const phase = useReveal(ref)
  // `as` changes the element only; typing the ref for every tag isn't worth a union here.
  const Tag = as as 'div'
  return (
    <Tag
      ref={ref}
      data-reveal={phase}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  )
}
