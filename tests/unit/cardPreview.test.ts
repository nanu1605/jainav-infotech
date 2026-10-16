import { describe, expect, it, vi } from 'vitest'

import { hoverPreview, viewPreview } from '@/components/product/CardPreview'

vi.stubGlobal('document', { hidden: false })

const player = () => {
  const p = {
    playing: false,
    currentTime: 3,
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
})
