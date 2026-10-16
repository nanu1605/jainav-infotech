'use client'

import { Fragment, useRef, type CSSProperties } from 'react'

import { useReveal } from './Reveal'

/**
 * Words and the collapsible spaces between them, in order (joined, they are the text again).
 * Each word becomes an inline-block, and the browser may wrap between any two inline-blocks, so
 * words are split only where plain text has a space: never inside a Devanagari word, never
 * between "₹" and "1,00,000" or a quote and its word (Intl.Segmenter boundaries would allow
 * those breaks). Spaces stay plain text, so spacing and wrapping match the unanimated text.
 */
export const revealPieces = (text: string) => text.split(/([ \t\n\r\f]+)/).filter(Boolean)

const isSpace = (piece: string) => /^[ \t\n\r\f]+$/.test(piece)

type Props = {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p'
  className?: string
}

/**
 * Headline that reveals word by word when it scrolls into view (spec §14). Screen readers and
 * search engines get the text once, from a visually hidden copy; the animated words are hidden
 * from assistive technology. Above-the-fold headlines render static (see useReveal).
 */
export function TextReveal({ text, as: Tag = 'h2', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const phase = useReveal(ref)
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden data-stagger={phase}>
        {revealPieces(text).map((piece, i) =>
          isSpace(piece) ? (
            <Fragment key={i}>{piece}</Fragment>
          ) : (
            // Word i of the sentence: its delay is --i stagger steps (globals.css).
            <span
              key={i}
              data-reveal=""
              className="inline-block"
              style={{ '--i': Math.floor(i / 2) } as CSSProperties}
            >
              {piece}
            </span>
          ),
        )}
      </span>
    </Tag>
  )
}
