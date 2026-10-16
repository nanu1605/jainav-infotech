'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Marks the feature step crossing the middle of the viewport (`data-step`) and its media in the
 * sticky frame (`data-frame`) with `data-active`; CSS does the cross-fade. No React state and no
 * scroll handlers: one IntersectionObserver on a band around the middle. A step without media
 * keeps the previous frame. The server marks the first ones active, so first paint is complete.
 */
export function FeatureScrollerSync({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')]
    const frames = [...root.querySelectorAll<HTMLElement>('[data-frame]')]
    const io = new IntersectionObserver(
      (entries) => {
        // The step that just entered the band (the newest entry) wins.
        const hit = entries.filter((e) => e.isIntersecting).at(-1)?.target
        if (!hit) return
        for (const s of steps) s.toggleAttribute('data-active', s === hit)
        const id = (hit as HTMLElement).dataset.step
        if (frames.some((f) => f.dataset.frame === id))
          for (const f of frames) f.toggleAttribute('data-active', f.dataset.frame === id)
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const s of steps) io.observe(s)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
