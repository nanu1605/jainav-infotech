/**
 * Data and geometry for the VYRO hero demo (spec §14). The values are an illustrative gaming
 * session, not measurements. Pure module: the server and the browser build identical paths.
 */

/** One sample per step: needles and readouts move to it, the graph scrolls one sample. */
export const STEP_MS = 1500

export type Sample = { cpu: number; cpuMhz: number; gpu: number; gpuMhz: number; temp: number }
export type GaugeKey = 'cpu' | 'gpu'

// prettier-ignore
export const SCRIPT: readonly Sample[] = [
  { cpu: 34, cpuMhz: 4620, gpu: 78, gpuMhz: 2610, temp: 64 },
  { cpu: 41, cpuMhz: 4710, gpu: 84, gpuMhz: 2655, temp: 66 },
  { cpu: 38, cpuMhz: 4680, gpu: 88, gpuMhz: 2670, temp: 67 },
  { cpu: 46, cpuMhz: 4790, gpu: 91, gpuMhz: 2685, temp: 69 },
  { cpu: 52, cpuMhz: 4850, gpu: 93, gpuMhz: 2700, temp: 71 },
  { cpu: 49, cpuMhz: 4820, gpu: 90, gpuMhz: 2690, temp: 72 },
  { cpu: 44, cpuMhz: 4760, gpu: 86, gpuMhz: 2665, temp: 71 },
  { cpu: 37, cpuMhz: 4650, gpu: 81, gpuMhz: 2640, temp: 69 },
  { cpu: 31, cpuMhz: 4540, gpu: 74, gpuMhz: 2595, temp: 67 },
  { cpu: 29, cpuMhz: 4480, gpu: 69, gpuMhz: 2560, temp: 65 },
  { cpu: 33, cpuMhz: 4560, gpu: 72, gpuMhz: 2580, temp: 63 },
  { cpu: 39, cpuMhz: 4690, gpu: 79, gpuMhz: 2620, temp: 62 },
  { cpu: 45, cpuMhz: 4780, gpu: 85, gpuMhz: 2650, temp: 63 },
  { cpu: 50, cpuMhz: 4840, gpu: 89, gpuMhz: 2675, temp: 65 },
  { cpu: 43, cpuMhz: 4740, gpu: 83, gpuMhz: 2645, temp: 66 },
  { cpu: 36, cpuMhz: 4610, gpu: 76, gpuMhz: 2600, temp: 65 },
]

const f = (n: number) => Number(n.toFixed(2))

/** A dial in its own 200 × 172 box (VYRO's proportions): 270° from the bottom left, clockwise. */
export const DIAL = { w: 200, h: 172, cx: 100, cy: 94, r: 76, value: 9, track: 11 }
const START = 135
export const SWEEP = 270
/** How far a round cap reaches past the value arc's end, in degrees. */
export const CAP = ((DIAL.value / 2 / DIAL.r) * 180) / Math.PI

/** Degrees from the dial's start for a 0–100 reading. */
export const turn = (value: number) => f((Math.min(Math.max(value, 0), 100) / 100) * SWEEP)

export const polar = (deg: number, radius: number) => {
  const a = ((START + deg) * Math.PI) / 180
  return [f(DIAL.cx + radius * Math.cos(a)), f(DIAL.cy + radius * Math.sin(a))] as const
}

/** Arc from `from` to `to` degrees (measured from the dial's start) at `radius`. */
export function arc(from: number, to: number, radius = DIAL.r) {
  const [x1, y1] = polar(from, radius)
  const [x2, y2] = polar(to, radius)
  return `M${x1} ${y1}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

const TICK_IN = DIAL.r - DIAL.value * 0.95
const ticks = (major: boolean) =>
  Array.from({ length: 51 }, (_, i) => i)
    .filter((i) => (i % 5 === 0) === major)
    .map((i) => {
      const deg = (i / 50) * SWEEP
      const [x1, y1] = polar(deg, TICK_IN)
      const [x2, y2] = polar(deg, TICK_IN - DIAL.value * (major ? 0.75 : 0.35))
      return `M${x1} ${y1}L${x2} ${y2}`
    })
    .join('')

/** VYRO's scale: 50 ticks, a major one every 10%, labels every 20%. */
export const TICKS = { major: ticks(true), minor: ticks(false) }
export const TICK_LABELS = [0, 20, 40, 60, 80, 100].map((v) => ({
  v,
  at: polar(turn(v), DIAL.r + DIAL.value * 1.6),
}))

/** Everything but the open bottom of the dial; the cover arc is clipped to it. */
export const DIAL_CLIP = [
  [DIAL.cx, DIAL.cy],
  polar(0, 300),
  [-300, -300],
  [500, -300],
  polar(SWEEP, 300),
]
  .map((p) => p.join(','))
  .join(' ')

/**
 * The value arc is drawn once, and a track-colored cover arc rotates with the needle to hide the
 * part past the reading (rotation only: no dash offsets or path morphing). That works while the
 * readings stay in a band: the cover must reach past the arc's end for the lowest reading without
 * wrapping onto its start for the highest. Checked in tests/unit/vyroGauges.test.ts.
 */
export function coverFor(key: GaugeKey) {
  const turns = SCRIPT.map((s) => turn(s[key]))
  const lo = Math.min(...turns)
  const hi = Math.max(...turns)
  const end = hi + 2 * CAP
  return { end, length: (end + CAP - lo + 360 - hi) / 2 }
}

/** The temperature graph: two periods of the script side by side, so it can loop seamlessly. */
export const GRAPH = { x: 28, y: 234, w: 344, h: 40, min: 56, max: 76 }

export function graphPaths(temps: readonly number[]) {
  const n = temps.length
  const y = (t: number) => f(GRAPH.y + GRAPH.h * (1 - (t - GRAPH.min) / (GRAPH.max - GRAPH.min)))
  // Point k shows sample k mod n, so after i steps of scrolling the right edge shows sample i.
  const points = Array.from(
    { length: 2 * n + 1 },
    (_, k) => `${f(GRAPH.x + (k * GRAPH.w) / n)} ${y(temps[k % n] ?? GRAPH.min)}`,
  )
  const line = `M${points.join('L')}`
  return { line, area: `${line}V${GRAPH.y + GRAPH.h}H${GRAPH.x}Z`, y }
}
