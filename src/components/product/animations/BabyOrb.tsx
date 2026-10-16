'use client'

import { Play, Square } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react'

import { revealPieces } from '@/components/motion/TextReveal'
import { Button } from '@/components/ui/Button'

import { buildTimeline, restFrame, type OrbState } from './baby/script'

export type BabySample = { label: string; src: string; transcript?: string }

/** One exchange per language Baby speaks; the lines are the same on both site languages. */
const EXCHANGES = [
  { key: 'english', lang: 'en' },
  { key: 'hindi', lang: 'hi' },
  { key: 'hinglish', lang: 'hi-Latn' },
] as const

const STATES = ['listening', 'thinking', 'speaking'] as const

/*
 * The orb is HTML layers (halo, gauge ring, ripples, thinking dots, SVG core, voice bars), so every
 * loop is a CSS animation of `scale`, `rotate` or `opacity` on its own compositor layer: smooth
 * with a busy main thread and no per-frame JavaScript. `data-orb` picks the loops, `data-paused`
 * freezes them (off screen, hidden tab, before hydration). Words only animate in (hiding is
 * instant); exchanges cross-fade. Reduced motion: no loops, and every exchange is shown in full.
 * `--bo-a` resolves the accent here: `--color-product-accent` is resolved on :root, without it.
 * React hoists this <style> into <head> once.
 */
const CSS = `
.bo{--bo-a:var(--product-accent,var(--brand-accent))}
.bo-orb>*{position:absolute;border-radius:9999px}
.bo-halo{inset:-35%;background:radial-gradient(closest-side,color-mix(in oklch,var(--bo-a) 40%,transparent),transparent);animation:bo-glow 4.8s var(--ease-in-out) infinite}
.bo-ring{inset:8%;border:2px solid color-mix(in oklch,var(--bo-a) 45%,transparent)}
.bo-ripple{inset:8%;border:2px solid var(--bo-a);opacity:0}
.bo-orbit{inset:8%;opacity:0;transition:opacity var(--duration-base) var(--ease-out)}
.bo-orbit>i{position:absolute;inset:0;rotate:calc(var(--k)*120deg)}
.bo-orbit>i::before{content:"";position:absolute;top:-3%;left:47%;width:6%;height:6%;border-radius:9999px;background:var(--bo-a)}
.bo-core{inset:18%;width:64%;height:64%;animation:bo-breathe 4.8s var(--ease-in-out) infinite}
.bo-bars{inset:18%;display:flex;align-items:center;justify-content:center;gap:7%}
.bo-bars>i{width:7%;height:40%;border-radius:9999px;background:var(--neutral-0);opacity:.9;scale:1 .25}
[data-orb=listening] .bo-ripple{animation:bo-ripple 2.4s var(--ease-out) infinite}
[data-orb=listening] .bo-ripple+.bo-ripple{animation-delay:-1.2s}
[data-orb=thinking] .bo-orbit{opacity:1;animation:bo-spin 1.4s linear infinite}
[data-orb=speaking] .bo-core{animation:bo-talk 1.1s var(--ease-in-out) infinite}
[data-orb=speaking] .bo-halo{animation:bo-talk-glow 1.1s var(--ease-in-out) infinite}
[data-orb=speaking] .bo-bars>i{animation:bo-bar .42s var(--ease-in-out) infinite alternate;animation-delay:calc(var(--k)*-.19s)}
.bo[data-paused] *{animation-play-state:paused!important}
.bo-ex,.bo-chip{grid-area:1/1;opacity:0;transition:opacity var(--duration-fast) var(--ease-out)}
.bo-ex[data-on],.bo-chip[data-on]{opacity:1;transition-duration:var(--duration-base);transition-delay:var(--duration-fast)}
.bo-w{display:inline-block;opacity:0;translate:0 .3em}
.bo-w[data-on]{opacity:1;translate:none;transition:opacity var(--duration-base) var(--ease-out),translate var(--duration-base) var(--ease-out)}
@keyframes bo-breathe{50%{scale:1.035}}
@keyframes bo-glow{0%,100%{opacity:.6;scale:.95}50%{opacity:.85;scale:1.03}}
@keyframes bo-ripple{from{opacity:.7;scale:1}to{opacity:0;scale:1.45}}
@keyframes bo-spin{to{rotate:1turn}}
@keyframes bo-talk{0%,100%{scale:1}18%{scale:1.07}34%{scale:1.02}52%{scale:1.1}70%{scale:1.03}86%{scale:1.08}}
@keyframes bo-talk-glow{0%,100%{opacity:.75;scale:1}20%{opacity:1;scale:1.1}45%{opacity:.8;scale:1.03}60%{opacity:1;scale:1.13}85%{opacity:.85;scale:1.05}}
@keyframes bo-bar{to{scale:1 1}}
@media (prefers-reduced-motion:reduce){
.bo *{animation:none!important}
.bo-ex{grid-area:auto;opacity:1}
.bo-w{opacity:1;translate:none}
}
`

const k = (i: number) => ({ '--k': i }) as CSSProperties

/** A line revealed word by word: whole words split at spaces, never letters (Hindi matras). */
function Words({ text, shown }: { text: string; shown: number }) {
  return revealPieces(text).map((piece, i) =>
    piece.trim() ? (
      // Messages start with a word, so words and spaces alternate: piece i is word i/2.
      <span key={i} className="bo-w" data-on={Math.floor(i / 2) < shown ? '' : undefined}>
        {piece}
      </span>
    ) : (
      <Fragment key={i}>{piece}</Fragment>
    ),
  )
}

type Props = {
  /** "Hear Baby speak" clips, played on click only; no control at all without them. */
  samples?: BabySample[]
  className?: string
}

/**
 * Baby's product hero animation (spec §14): a voice orb that listens, thinks and speaks through a
 * scripted English / Hindi / Hinglish conversation. The server renders the still frame (the
 * first exchange, orb at rest); the script runs only on screen, in a visible tab and without
 * reduced motion. Optional voice samples play through one shared audio element.
 */
export function BabyOrb({ samples, className }: Props) {
  const t = useTranslations('ui.demo.baby')
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const audio = useRef<HTMLAudioElement>(null)

  const lines = EXCHANGES.map(({ key }) => ({
    you: t(`script.${key}.you`),
    baby: t(`script.${key}.baby`),
  }))
  const count = (s: string) => revealPieces(s).filter((p) => p.trim()).length
  const timeline = buildTimeline(lines.map((l) => ({ you: count(l.you), baby: count(l.baby) })))

  const [tick, setTick] = useState(() => restFrame(timeline))
  const [live, setLive] = useState(false)
  const [sample, setSample] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)

  // Live while on screen in a visible tab; never with reduced motion (the still frame stays).
  useEffect(() => {
    const el = root.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let onScreen = false
    const update = () => setLive(onScreen && !document.hidden)
    const io = new IntersectionObserver(([entry]) => {
      onScreen = !!entry?.isIntersecting
      update()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  // A sample playing holds the script; a paused step restarts in full when it resumes.
  const frame = timeline[tick] ?? timeline[0]!
  const steps = timeline.length
  useEffect(() => {
    if (!live || playing) return
    const timer = setTimeout(() => setTick((i) => (i + 1) % steps), frame.ms)
    return () => clearTimeout(timer)
  }, [live, playing, tick, frame.ms, steps])

  const orb: OrbState = playing ? 'speaking' : frame.orb

  const toggle = (i: number) => {
    const el = audio.current
    const next = samples?.[i]
    if (!el || !next) return
    if (playing && sample === i) {
      el.pause()
      el.currentTime = 0
      setPlaying(false)
      return
    }
    el.src = next.src // a new source stops the previous sample
    setSample(i)
    setPlaying(true)
    el.play().catch((e: unknown) => {
      // AbortError: interrupted by another click, whose state is already set.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setPlaying(false)
    })
  }

  const transcript = sample === null ? undefined : samples?.[sample]?.transcript

  return (
    <div className={className}>
      <style href="baby-orb" precedence="default">
        {CSS}
      </style>
      <div
        ref={root}
        role="img"
        aria-label={t('label')}
        data-orb={orb}
        data-paused={live ? undefined : ''}
        // Height comes from the 4:3 ratio, so nothing shifts when the script runs; it grows only
        // if its text needs more room (narrow screens, reduced motion), already in the first paint.
        className="bo relative flex aspect-[4/3] flex-col overflow-clip rounded-xl border border-border bg-surface p-4 shadow-lg sm:p-8"
      >
        <div aria-hidden className="absolute inset-0 bg-product-accent/5" />
        <div aria-hidden className="relative flex flex-1 flex-col gap-4">
          <div className="absolute start-0 top-0 grid">
            {STATES.map((s) => (
              <span
                key={s}
                className="bo-chip inline-flex items-center gap-1.5 justify-self-start rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg-muted"
                data-on={orb === s ? '' : undefined}
              >
                <span className="size-1.5 rounded-full bg-product-accent" />
                {t(s)}
              </span>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-center py-2">
            <div className="bo-orb relative aspect-square w-[36%] motion-reduce:w-[18%]">
              <span className="bo-halo" />
              <span className="bo-ring" />
              <span className="bo-ripple" />
              <span className="bo-ripple" />
              <span className="bo-orbit">
                {[0, 1, 2].map((i) => (
                  <i key={i} style={k(i)} />
                ))}
              </span>
              <svg viewBox="0 0 100 100" className="bo-core">
                <defs>
                  <radialGradient id={`${id}core`} cx="35%" cy="30%" r="75%">
                    <stop
                      offset="0"
                      style={{
                        stopColor: 'color-mix(in oklch, var(--bo-a) 40%, var(--neutral-0))',
                      }}
                    />
                    <stop offset="0.55" style={{ stopColor: 'var(--bo-a)' }} />
                    <stop
                      offset="1"
                      style={{
                        stopColor: 'color-mix(in oklch, var(--bo-a) 60%, var(--neutral-1000))',
                      }}
                    />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill={`url(#${id}core)`} />
              </svg>
              <span className="bo-bars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} style={k(i)} />
                ))}
              </span>
            </div>
          </div>

          <div className="grid motion-reduce:gap-3">
            {EXCHANGES.map(({ key, lang }, i) => {
              const active = i === frame.exchange
              // Other exchanges keep every word on, so one fading out stays whole.
              const shown = (n: number) => (active ? n : Infinity)
              return (
                <div key={key} className="bo-ex" data-on={active ? '' : undefined}>
                  <span className="inline-flex rounded-full border border-border px-2 text-xs text-fg-muted">
                    {t(`languages.${key}`)}
                  </span>
                  <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 text-sm sm:text-base">
                    <dt className="text-fg-muted">{t('you')}</dt>
                    <dd lang={lang} className="text-fg-muted">
                      <Words text={lines[i]!.you} shown={shown(frame.you)} />
                    </dd>
                    <dt className="font-semibold text-fg">{t('baby')}</dt>
                    <dd lang={lang} className="text-fg">
                      <Words text={lines[i]!.baby} shown={shown(frame.baby)} />
                    </dd>
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {!!samples?.length && (
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
          <audio
            ref={audio}
            preload="none"
            onEnded={() => setPlaying(false)}
            onError={() => setPlaying(false)}
          />
          {transcript && <p className="mt-3 max-w-prose text-sm text-fg-muted">{transcript}</p>}
        </div>
      )}
    </div>
  )
}
