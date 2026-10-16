'use client'

import { useState } from 'react'

import { deferred } from '@/components/deferred'
import { cn } from '@/lib/cn'

import { BabySamples, type BabySample } from './baby/Samples'

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

const Orb = deferred(() => import('./BabyOrb').then((m) => m.BabyOrb), menu, menu)

/** Baby's orb (its box has MenuMesh's shape), with the voice samples outside its chunk. */
export function BabyOrb({ samples }: { samples?: BabySample[] }) {
  const [playing, setPlaying] = useState(false)
  return (
    <>
      <Orb speaking={playing} />
      {!!samples?.length && (
        <BabySamples samples={samples} playing={playing} onPlaying={setPlaying} />
      )}
    </>
  )
}
