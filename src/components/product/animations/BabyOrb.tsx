'use client'

import { Pause, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react'

import { revealPieces } from '@/components/motion/TextReveal'
import { IconButton } from '@/components/ui/IconButton'

import { buildTimeline, restFrame, type OrbState } from './baby/script'

export type { BabySample } from './baby/Samples'

/** One exchange per language Baby speaks; the lines are the same on both site languages. */
const EXCHANGES = [
  { key: 'english', lang: 'en' },
  { key: 'hindi', lang: 'hi' },
  { key: 'hinglish', lang: 'hi-Latn' },
] as const

const STATES = ['listening', 'thinking', 'speaking'] as const

/*
 * The orb is HTML layers (halo, gauge ring, ripples, thinking dots, core, voice bars), so every
 * loop is a CSS animation of `scale`, `rotate` or `opacity` on its own compositor layer: smooth
 * with a busy main thread and no per-frame JavaScript. The SVG core sits in a <span> for that:
 * Chrome does not composite `scale` on an SVG element. `data-orb` picks the loops, `data-paused`
 * freezes them (off screen, hidden tab, paused, before hydration). Words only animate in (hiding
 * is instant); exchanges cross-fade. Reduced motion: no loops, the still frame (first exchange).
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
.bo-core{inset:18%;animation:bo-breathe 4.8s var(--ease-in-out) infinite}
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
  /** A voice sample is playing: the orb speaks along, even while the script is paused. */
  speaking?: boolean
}

/**
 * Baby's product hero animation (spec §14): a voice orb that listens, thinks and speaks through a
 * scripted English / Hindi / Hinglish conversation. The server renders the still frame (the
 * first exchange, orb at rest); the script runs only on screen, in a visible tab, without
 * reduced motion and until the visitor pauses it. The box keeps its aspect ratio whatever the
 * text (size containment, text in container units), so its placeholder matches it exactly.
 */
export function BabyOrb({ speaking = false }: Props) {
  const t = useTranslations('ui.demo.baby')
  const id = useId()
  const root = useRef<HTMLDivElement>(null)

  const lines = EXCHANGES.map(({ key }) => ({
    you: t(`script.${key}.you`),
    baby: t(`script.${key}.baby`),
  }))
  const count = (s: string) => revealPieces(s).filter((p) => p.trim()).length
  const timeline = buildTimeline(lines.map((l) => ({ you: count(l.you), baby: count(l.baby) })))

  const [tick, setTick] = useState(() => restFrame(timeline))
  const [live, setLive] = useState(false)
  const [paused, setPaused] = useState(false)

  // Live while on screen in a visible tab; never with reduced motion (the still frame stays).
  useEffect(() => {
    const el = root.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let onScreen = false
    const update = () => setLive(onScreen && !document.hidden)
    // Entries can be batched: the last one is the current state.
    const io = new IntersectionObserver((entries) => {
      onScreen = entries.at(-1)?.isIntersecting ?? onScreen
      update()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  // A sample playing or the pause button holds the script; a held step restarts in full.
  const frame = timeline[tick] ?? timeline[0]!
  const steps = timeline.length
  useEffect(() => {
    if (!live || paused || speaking) return
    const timer = setTimeout(() => setTick((i) => (i + 1) % steps), frame.ms)
    return () => clearTimeout(timer)
  }, [live, paused, speaking, tick, frame.ms, steps])

  const orb: OrbState = speaking ? 'speaking' : frame.orb

  return (
    <div className="relative">
      <style href="baby-orb" precedence="default">
        {CSS}
      </style>
      <div
        ref={root}
        role="img"
        aria-label={t('label')}
        data-orb={orb}
        // A sample the visitor started keeps the orb moving while the script is paused.
        data-paused={live && (!paused || speaking) ? undefined : ''}
        className="bo relative aspect-[4/5] overflow-clip rounded-xl border border-border bg-surface shadow-lg [container-type:size] sm:aspect-[4/3]"
      >
        <div aria-hidden className="absolute inset-0 bg-product-accent/5" />
        <div
          aria-hidden
          className="absolute inset-0 flex flex-col gap-[1em] p-[1.25em] text-[length:min(4.4cqw,1rem)] leading-normal sm:p-[1.75em] sm:text-[length:min(3cqw,1.125rem)]"
        >
          <div className="absolute start-[1.25em] top-[1.25em] grid sm:start-[1.75em] sm:top-[1.75em]">
            {STATES.map((s) => (
              <span
                key={s}
                className="bo-chip inline-flex items-center gap-[0.5em] justify-self-start rounded-full border border-border bg-surface px-[0.85em] py-[0.35em] text-[max(0.75em,0.6875rem)] text-fg-muted"
                data-on={orb === s ? '' : undefined}
              >
                <span className="size-[0.5em] rounded-full bg-product-accent" />
                {t(s)}
              </span>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center py-[0.5em]">
            <div className="bo-orb relative aspect-square w-[36%]">
              <span className="bo-halo" />
              <span className="bo-ring" />
              <span className="bo-ripple" />
              <span className="bo-ripple" />
              <span className="bo-orbit">
                {[0, 1, 2].map((i) => (
                  <i key={i} style={k(i)} />
                ))}
              </span>
              <span className="bo-core">
                <svg viewBox="0 0 100 100" className="size-full">
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
              </span>
              <span className="bo-bars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} style={k(i)} />
                ))}
              </span>
            </div>
          </div>

          <div className="grid">
            {EXCHANGES.map(({ key, lang }, i) => {
              const active = i === frame.exchange
              // Other exchanges keep every word on, so one fading out stays whole.
              const shown = (n: number) => (active ? n : Infinity)
              return (
                <div key={key} className="bo-ex" data-on={active ? '' : undefined}>
                  <span className="inline-flex rounded-full border border-border px-[0.65em] text-[max(0.75em,0.6875rem)] text-fg-muted">
                    {t(`languages.${key}`)}
                  </span>
                  <dl className="mt-[0.4em] grid grid-cols-[auto_1fr] gap-x-[0.75em]">
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
      {/* Outside the image (its content is presentational) and over its corner: shifts nothing. */}
      <IconButton
        label={paused ? t('play') : t('pause')}
        size="sm"
        onClick={() => setPaused(!paused)}
        className="absolute end-3 top-3 size-8 motion-reduce:hidden sm:end-4 sm:top-4"
      >
        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
      </IconButton>
    </div>
  )
}
