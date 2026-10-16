'use client'

import { useRef, type ReactNode } from 'react'

import { useReveal, type RevealTag } from './Reveal'

type Props = { as?: RevealTag; className?: string; children: ReactNode }

/**
 * Reveals its `StaggerItem` children one after another when the group scrolls into view. The
 * per-item delay comes from the item's position (globals.css, `[data-stagger]`).
 */
export function Stagger({ as = 'div', className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const phase = useReveal(ref)
  // `as` changes the element only; typing the ref for every tag isn't worth a union here.
  const Tag = as as 'div'
  return (
    <Tag ref={ref} data-stagger={phase} className={className}>
      {children}
    </Tag>
  )
}

export function StaggerItem({ as: Tag = 'div', className, children }: Props) {
  return (
    <Tag data-reveal="" className={className}>
      {children}
    </Tag>
  )
}
