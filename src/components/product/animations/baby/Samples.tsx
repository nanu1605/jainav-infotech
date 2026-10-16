'use client'

import { Play, Square } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'

/** A "Hear Baby speak" clip; `lang` is the language spoken in it, for its transcript. */
export type BabySample = { label: string; src: string; transcript?: string; lang?: string }

type Props = {
  samples: BabySample[]
  /** Whether a clip is playing, owned by the parent so the orb can speak along. */
  playing: boolean
  onPlaying: (playing: boolean) => void
}

/**
 * "Hear Baby speak": voice clips played on click only, through one shared audio element. It is
 * not part of the orb's code-split chunk, so this row is on the page from the first paint and the
 * orb's placeholder only has to match the orb's own box. The element's play and pause events keep
 * `playing` true to what is heard (media keys, the OS media controls, a headphone unplug).
 */
export function BabySamples({ samples, playing, onPlaying }: Props) {
  const t = useTranslations('ui.demo.baby')
  const id = useId()
  const audio = useRef<HTMLAudioElement>(null)
  const [sample, setSample] = useState<number | null>(null)

  const toggle = (i: number) => {
    const el = audio.current
    const next = samples[i]
    if (!el || !next) return
    if (playing && sample === i) {
      el.pause()
      el.currentTime = 0
      return
    }
    el.src = next.src // a new source stops the previous sample
    setSample(i)
    onPlaying(true) // right away; the play event confirms it
    el.play().catch((e: unknown) => {
      // AbortError: interrupted by another click, whose state is already set.
      if (!(e instanceof DOMException && e.name === 'AbortError')) onPlaying(false)
    })
  }

  const current = sample === null ? undefined : samples[sample]

  return (
    <div role="group" aria-labelledby={`${id}hear`} className="mt-4">
      <p id={`${id}hear`} className="text-sm font-medium text-fg">
        {t('hear')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {samples.map((s, i) => {
          const on = playing && sample === i
          return (
            <Button
              key={`${i}-${s.src}`}
              variant="secondary"
              size="sm"
              aria-pressed={on}
              onClick={() => toggle(i)}
              className="aria-pressed:border-product-accent aria-pressed:bg-hover"
            >
              {on ? <Square aria-hidden /> : <Play aria-hidden />}
              {s.label}
            </Button>
          )
        })}
      </div>
      {/* `pause` also fires when a clip ends; an error may come without one. */}
      <audio
        ref={audio}
        preload="none"
        onPlay={() => onPlaying(true)}
        onPause={() => onPlaying(false)}
        onError={() => onPlaying(false)}
      />
      {current?.transcript && (
        <p lang={current.lang} className="mt-3 max-w-prose text-sm text-fg-muted">
          {current.transcript}
        </p>
      )}
    </div>
  )
}
