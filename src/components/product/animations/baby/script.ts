/**
 * Timeline of the Baby hero's scripted conversation (spec §14): one frame per step, each saying
 * which exchange is on screen, how many words of each line are shown, the orb's state and how
 * long the step lasts. Pure, so the server and tests build the same frames as the browser.
 */
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

export type Frame = { exchange: number; you: number; baby: number; orb: OrbState; ms: number }

/** Milliseconds: before the user speaks, per word said, Baby thinking, and the pause after. */
export const TIMING = { listen: 900, youWord: 260, think: 800, babyWord: 300, hold: 2800 }

/** Frames for exchanges of `you` and `baby` words, in order; the last one loops to the first. */
export function buildTimeline(exchanges: ReadonlyArray<{ you: number; baby: number }>): Frame[] {
  return exchanges.flatMap(({ you, baby }, exchange) => {
    const at = (orb: OrbState, y: number, b: number, ms: number): Frame => ({
      exchange,
      you: y,
      baby: b,
      orb,
      ms,
    })
    return [
      at('listening', 0, 0, TIMING.listen),
      ...Array.from({ length: you }, (_, i) => at('listening', i + 1, 0, TIMING.youWord)),
      at('thinking', you, 0, TIMING.think),
      ...Array.from({ length: baby }, (_, i) => at('speaking', you, i + 1, TIMING.babyWord)),
      at('idle', you, baby, TIMING.hold),
    ]
  })
}

/**
 * The still frame: the first exchange in full with the orb at rest. It is the server render and
 * the reduced-motion view, and the script starts from it, so starting changes nothing on screen.
 */
export const restFrame = (timeline: Frame[]) =>
  timeline.findIndex((f) => f.exchange === 0 && f.orb === 'idle')
