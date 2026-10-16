'use client'

import { deferred } from '@/components/deferred'
import { cn } from '@/lib/cn'

/** The animation's box, empty: while it streams in, or if its code fails to download. */
const box = (shape: string) =>
  function Box() {
    return (
      <div
        aria-hidden
        className={cn('w-full rounded-xl border border-border bg-surface shadow-lg', shape)}
      />
    )
  }
const wide = box('aspect-[4/3]')
const menu = box('aspect-[4/5] sm:aspect-[4/3]')

// The product hero animations (spec §14), each in its own chunk; the server renders the still frame.
export const MenuMeshDemo = deferred(
  () => import('./MenuMeshDemo').then((m) => m.MenuMeshDemo),
  menu,
  menu,
)
export const VyroGauges = deferred(
  () => import('./VyroGauges').then((m) => m.VyroGauges),
  wide,
  wide,
)
export const BabyOrb = deferred(() => import('./BabyOrb').then((m) => m.BabyOrb), wide, wide)
