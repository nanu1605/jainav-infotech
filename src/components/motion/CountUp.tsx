'use client'

import { cubicBezier, useReducedMotion } from 'motion/react'
import { useLocale } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'
import { numberFormat } from '@/lib/format'
import { EASE_OUT } from '@/lib/motion'

import { useReveal } from './Reveal'

/** A frame's value, rounded to the target's decimals so the digits don't flicker mid-count. */
export const countFrame = (target: number, progress: number) => {
  const decimals = target.toString().split('.')[1]?.length ?? 0
  return Number((target * progress).toFixed(decimals))
}

const ease = cubicBezier(...EASE_OUT)

type Props = {
  value: number
  locale?: Locale
  format?: Intl.NumberFormatOptions
  durationMs?: number
  className?: string
}

/**
 * A number that counts up from zero the first time it scrolls into view (spec §14). The server
 * renders the final value, which stays in the DOM for screen readers and sizes the box (no layout
 * shift); the count is an aria-hidden overlay. On screen at load or with reduced motion, the
 * final value is shown straight away.
 */
export function CountUp({ value, locale, format, durationMs = 1600, className }: Props) {
  const current = useLocale() as Locale
  const nf = useMemo(() => numberFormat(locale ?? current, format), [locale, current, format])
  const ref = useRef<HTMLSpanElement>(null)
  const overlay = useRef<HTMLSpanElement>(null)
  const phase = useReveal(ref)
  const reduce = useReducedMotion()
  const [done, setDone] = useState(false)
  const counting = phase !== 'static' && !reduce && !done

  useEffect(() => {
    if (phase !== 'shown' || reduce || done) return
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / durationMs)
      if (overlay.current) overlay.current.textContent = nf.format(countFrame(value, ease(t)))
      if (t < 1) frame = requestAnimationFrame(tick)
      else setDone(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [phase, reduce, done, value, durationMs, nf])

  return (
    <span ref={ref} className={cn('inline-grid tabular-nums', className)}>
      <span className={cn('[grid-area:1/1]', counting && 'opacity-0 print:opacity-100')}>
        {nf.format(value)}
      </span>
      {counting && (
        <span ref={overlay} aria-hidden className="[grid-area:1/1] print:hidden">
          {nf.format(0)}
        </span>
      )}
    </span>
  )
}
