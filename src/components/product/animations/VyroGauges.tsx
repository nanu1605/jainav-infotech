'use client'

import { Pause, Play } from 'lucide-react'
import { useInView, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'

import { IconButton } from '@/components/ui/IconButton'
import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'
import { numberFormat } from '@/lib/format'

import {
  DIAL,
  DIAL_CLIP,
  GRAPH,
  SCRIPT,
  STEP_MS,
  SWEEP,
  TICKS,
  TICK_LABELS,
  arc,
  coverFor,
  graphPaths,
  polar,
  turn,
  type GaugeKey,
  type Sample,
} from './vyro/script'

const VIEW = { w: 400, h: 300, header: 44 }
const FIRST = SCRIPT[0] as Sample
const GRAPH_PATHS = graphPaths(SCRIPT.map((s) => s.temp))
const GRID = [60, 70].map((t) => `M${GRAPH.x} ${GRAPH_PATHS.y(t)}h${GRAPH.w}`).join('')
const NEEDLE = `M${polar(0, DIAL.r * 0.56).join(' ')}L${polar(0, DIAL.r - DIAL.value * 1.1).join(' ')}`
const GAUGES = [
  {
    key: 'cpu',
    mhz: 'cpuMhz',
    x: 20,
    stroke: 'stroke-product-accent',
    fill: 'fill-product-accent',
  },
  { key: 'gpu', mhz: 'gpuMhz', x: 210, stroke: 'stroke-success', fill: 'fill-success' },
] as const
const COVER = { cpu: coverFor('cpu'), gpu: coverFor('gpu') }

// Needle and cover turn together around the dial's centre, following --turn on the dial.
const PIVOT: CSSProperties = {
  transform: 'rotate(var(--turn))',
  transformOrigin: `${DIAL.cx}px ${DIAL.cy}px`,
}
const SWING = 'transition-transform duration-[var(--duration-slow)] ease-in-out'
const turnVar = (value: number) => ({ '--turn': `${turn(value)}deg` }) as CSSProperties

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/** Moves the needles and readouts to a sample: a handful of DOM writes per step, no re-render. */
function show(root: HTMLElement, s: Sample, nf: Intl.NumberFormat) {
  root.querySelectorAll<SVGElement>('[data-turn]').forEach((el) => {
    el.style.setProperty('--turn', `${turn(s[el.dataset.turn as GaugeKey])}deg`)
  })
  root.querySelectorAll<SVGElement>('[data-key]').forEach((el) => {
    el.textContent = nf.format(s[el.dataset.key as keyof Sample])
  })
}

/**
 * VYRO hero animation (spec §14): the app's CPU and GPU speedometers and a temperature graph,
 * playing a scripted, illustrative session. Always a dark instrument panel, like the app.
 *
 * The server HTML is the first sample, complete. After hydration the graph scrolls (Web
 * Animations, transform only) and its clock drives the steps: every STEP_MS the needles and
 * cover arcs turn (CSS transition on transform) and the readouts change via textContent. It runs
 * only on screen, in a visible tab, without reduced motion and until the visitor pauses it.
 */
export function VyroGauges({ className }: { className?: string }) {
  const t = useTranslations('ui.demo.vyro')
  const locale = useLocale() as Locale
  const nf = useMemo(() => numberFormat(locale), [locale])
  const id = useId().replace(/[^\w-]/g, '')
  const root = useRef<HTMLDivElement>(null)
  const graph = useRef<SVGGElement>(null)
  const scroll = useRef<Animation | null>(null)
  const inView = useInView(root, { amount: 0.2 })
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => false,
  )
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const running = inView && visible && !reduce && !paused

  useEffect(() => {
    const el = root.current
    const g = graph.current
    if (!running || !el || !g) return
    scroll.current ??= g.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${-GRAPH.w}px)` }],
      { duration: SCRIPT.length * STEP_MS, iterations: Infinity },
    )
    const anim = scroll.current
    anim.play()
    let shown = -1
    const tick = () => {
      const now = typeof anim.currentTime === 'number' ? anim.currentTime : 0
      const i = Math.floor(now / STEP_MS) % SCRIPT.length
      if (i === shown) return
      shown = i
      show(el, SCRIPT[i] as Sample, nf)
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => {
      clearInterval(timer)
      anim.pause()
    }
  }, [running, nf])

  useEffect(
    () => () => {
      scroll.current?.cancel()
      scroll.current = null
    },
    [],
  )

  return (
    <div ref={root} className={cn('relative aspect-[4/3] w-full rounded-xl shadow-lg', className)}>
      <div
        data-theme="dark"
        className="absolute inset-0 overflow-hidden rounded-[inherit] border border-border bg-bg text-fg"
      >
        <div role="img" aria-label={t('label')} className="size-full">
          <svg
            aria-hidden
            viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
            className="size-full font-sans tabular-nums"
          >
            <defs>
              <radialGradient id={`${id}-glow`} cx="15%" cy="0%" r="80%">
                <stop
                  offset="0"
                  style={{
                    stopColor: 'var(--product-accent, var(--brand-accent))',
                    stopOpacity: 0.16,
                  }}
                />
                <stop
                  offset="1"
                  style={{
                    stopColor: 'var(--product-accent, var(--brand-accent))',
                    stopOpacity: 0,
                  }}
                />
              </radialGradient>
              <clipPath id={`${id}-dial`}>
                <polygon points={DIAL_CLIP} />
              </clipPath>
              <clipPath id={`${id}-graph`}>
                <rect x={GRAPH.x} y={GRAPH.y - 4} width={GRAPH.w} height={GRAPH.h + 6} />
              </clipPath>
            </defs>
            <rect width={VIEW.w} height={VIEW.h} fill={`url(#${id}-glow)`} />
            {[24, 36, 48].map((cx) => (
              <circle
                key={cx}
                cx={cx}
                cy={VIEW.header / 2}
                r={3.5}
                className="fill-border-strong"
              />
            ))}

            {GAUGES.map((g) => (
              <g key={g.key}>
                <rect
                  x={g.x - 4}
                  y={VIEW.header}
                  width={178}
                  height={152}
                  rx={10}
                  className="fill-surface stroke-border"
                />
                <svg
                  data-turn={g.key}
                  x={g.x}
                  y={VIEW.header + 4}
                  width={170}
                  height={144}
                  viewBox={`0 0 ${DIAL.w} ${DIAL.h}`}
                  style={turnVar(FIRST[g.key])}
                >
                  <g fill="none">
                    <path
                      d={arc(0, SWEEP)}
                      strokeWidth={DIAL.track}
                      strokeLinecap="round"
                      className="stroke-border"
                    />
                    <path
                      d={arc(0, COVER[g.key].end)}
                      strokeWidth={DIAL.value}
                      strokeLinecap="round"
                      className={g.stroke}
                    />
                    {/* The clip sits on a still parent: on the cover itself it would turn with it. */}
                    <g clipPath={`url(#${id}-dial)`}>
                      <path
                        d={arc(0, COVER[g.key].length)}
                        strokeWidth={DIAL.track}
                        className={cn('stroke-border', SWING)}
                        style={PIVOT}
                      />
                    </g>
                    <path
                      d={TICKS.minor}
                      strokeWidth={1}
                      className="stroke-border-strong opacity-60"
                    />
                    <path d={TICKS.major} strokeWidth={2} className="stroke-border-strong" />
                    <path
                      d={NEEDLE}
                      strokeWidth={3}
                      strokeLinecap="round"
                      className={cn('stroke-fg', SWING)}
                      style={PIVOT}
                    />
                  </g>
                  {TICK_LABELS.map(({ v, at: [x, y] }) => (
                    <text
                      key={v}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={9}
                      className="fill-fg-muted"
                    >
                      {nf.format(v)}
                    </text>
                  ))}
                  <text
                    x={DIAL.cx}
                    y={DIAL.cy - DIAL.r * 0.3}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    className="fill-fg-muted"
                  >
                    {t(g.key)}
                  </text>
                  <text
                    x={DIAL.cx}
                    y={DIAL.cy + 12}
                    textAnchor="middle"
                    fontWeight={600}
                    className="fill-fg"
                  >
                    <tspan data-key={g.key} fontSize={34}>
                      {nf.format(FIRST[g.key])}
                    </tspan>
                    <tspan fontSize={14} className="fill-fg-muted">
                      {t('percent')}
                    </tspan>
                  </text>
                  <text
                    x={DIAL.cx}
                    y={DIAL.cy + DIAL.r * 0.62}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    className={g.fill}
                  >
                    <tspan data-key={g.mhz}>{nf.format(FIRST[g.mhz])}</tspan> {t('mhz')}
                  </text>
                </svg>
              </g>
            ))}

            <rect
              x={16}
              y={206}
              width={368}
              height={78}
              rx={10}
              className="fill-surface stroke-border"
            />
            <text x={GRAPH.x} y={224} fontSize={11} fontWeight={600} className="fill-fg-muted">
              {t('temperature')}
            </text>
            <text
              x={GRAPH.x + GRAPH.w}
              y={225}
              textAnchor="end"
              fontWeight={600}
              className="fill-fg"
            >
              <tspan data-key="temp" fontSize={15}>
                {nf.format(FIRST.temp)}
              </tspan>
              <tspan fontSize={11} className="fill-fg-muted">
                {` ${t('celsius')}`}
              </tspan>
            </text>
            <path d={GRID} strokeDasharray="2 4" className="stroke-border" />
            <g clipPath={`url(#${id}-graph)`}>
              <g ref={graph}>
                <path d={GRAPH_PATHS.area} className="fill-warning opacity-15" />
                <path
                  d={GRAPH_PATHS.line}
                  fill="none"
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  className="stroke-warning"
                />
              </g>
            </g>
          </svg>
        </div>
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-end gap-1.5 pe-[2.5%]"
          style={{ height: `${(VIEW.header / VIEW.h) * 100}%` }}
        >
          <span aria-hidden className="text-xs leading-normal font-medium text-fg-muted">
            {t('illustrative')}
          </span>
          <IconButton
            label={paused ? t('play') : t('pause')}
            size="sm"
            onClick={() => setPaused(!paused)}
            className="size-8 motion-reduce:hidden"
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}
