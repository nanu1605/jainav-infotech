import { describe, expect, it, vi } from 'vitest'

import {
  TOUCH_LIMIT_S,
  hoverPreview,
  limitPreview,
  viewPreview,
} from '@/components/product/CardPreview'

vi.stubGlobal('document', { hidden: false })

const player = () => {
  const p = {
    playing: false,
    currentTime: 3,
    ended: false,
    play: vi.fn(async () => void (p.playing = true)),
    pause: vi.fn(() => void (p.playing = false)),
  }
  return p
}

describe('card preview coordinator', () => {
  it('plays only the newest card in view and hands back when it leaves', () => {
    const [a, b, c] = [player(), player(), player()]
    viewPreview(a, true)
    expect(a.playing).toBe(true)
    expect(a.currentTime).toBe(0)
    viewPreview(b, true)
    expect([a.playing, b.playing]).toEqual([false, true])
    viewPreview(c, false) // never in view: changes nothing
    expect(b.playing).toBe(true)
    viewPreview(b, false)
    expect([a.playing, b.playing]).toEqual([true, false])
    viewPreview(a, false)
    expect(a.playing).toBe(false)
  })

  it('hover plays one card at a time and stops on leave', () => {
    const [a, b] = [player(), player()]
    hoverPreview(a, true)
    hoverPreview(b, true)
    expect([a.playing, b.playing]).toEqual([false, true])
    hoverPreview(a, false) // not the one playing
    expect(b.playing).toBe(true)
    hoverPreview(b, false)
    expect(b.playing).toBe(false)
  })

  it('touch previews stop by themselves before 5 s and replay only when handed back', () => {
    const [a, b] = [player(), player()]
    viewPreview(a, true)
    a.currentTime = TOUCH_LIMIT_S - 1
    limitPreview(a)
    expect(a.playing).toBe(true)
    a.currentTime = TOUCH_LIMIT_S
    limitPreview(a)
    expect(a.playing).toBe(false) // stays stopped while the card stays in view
    viewPreview(b, true)
    b.ended = true // a clip shorter than the limit
    limitPreview(b)
    expect([a.playing, b.playing]).toEqual([false, false])
    viewPreview(b, false) // hands back: a plays again from the start
    expect([a.playing, a.currentTime]).toEqual([true, 0])
    viewPreview(a, false)
  })
})
