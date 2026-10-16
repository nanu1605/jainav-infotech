import { describe, expect, it } from 'vitest'

import { buildTimeline, restFrame, TIMING } from '@/components/product/animations/baby/script'

describe('Baby hero script', () => {
  const timeline = buildTimeline([
    { you: 3, baby: 4 },
    { you: 2, baby: 1 },
  ])

  it('reveals the user line, then Baby’s, one word per step', () => {
    const first = timeline.filter((f) => f.exchange === 0)
    expect(first.map((f) => [f.orb, f.you, f.baby])).toEqual([
      ['listening', 0, 0],
      ['listening', 1, 0],
      ['listening', 2, 0],
      ['listening', 3, 0],
      ['thinking', 3, 0],
      ['speaking', 3, 1],
      ['speaking', 3, 2],
      ['speaking', 3, 3],
      ['speaking', 3, 4],
      ['idle', 3, 4],
    ])
    expect(timeline.every((f) => f.ms > 0)).toBe(true)
  })

  it('rests on the first exchange in full, then moves on to the next one', () => {
    const rest = restFrame(timeline)
    expect(timeline[rest]).toEqual({ exchange: 0, you: 3, baby: 4, orb: 'idle', ms: TIMING.hold })
    expect(timeline[rest + 1]).toMatchObject({ exchange: 1, you: 0, baby: 0 })
  })

  it('loops back to an empty first exchange', () => {
    expect(timeline.at(-1)).toMatchObject({ exchange: 1, orb: 'idle' })
    expect(timeline[0]).toMatchObject({ exchange: 0, you: 0, baby: 0, orb: 'listening' })
  })
})
