import { describe, expect, it } from 'vitest'

import { countFrame, numberFormat } from '@/components/motion/CountUp'
import { magneticPull } from '@/components/motion/MagneticButton'
import { revealPieces } from '@/components/motion/TextReveal'
import { pointerRatio } from '@/components/motion/Tilt'

describe('revealPieces (TextReveal)', () => {
  it('reproduces the text exactly, spaces included', () => {
    for (const text of [
      'Know your  machine — now.',
      'सॉफ़्टवेयर जो हम बनाते हैं, और जो हम आपके लिए बनाते हैं।',
    ]) {
      expect(revealPieces(text).join('')).toBe(text)
    }
  })

  it('keeps Devanagari words whole and spaces as separate pieces', () => {
    expect(revealPieces('अपनी मशीन को जानिए।')).toEqual([
      'अपनी',
      ' ',
      'मशीन',
      ' ',
      'को',
      ' ',
      'जानिए।',
    ])
  })

  it('does not break at a non-breaking space', () => {
    expect(revealPieces('₹1,00,000 only')).toEqual(['₹1,00,000 only'])
  })
})

describe('pointer effects', () => {
  const box = { left: 100, top: 100, width: 200, height: 100 }

  it('maps the pointer to -1…1 and clamps outside the box', () => {
    expect(pointerRatio(200, 150, box)).toEqual({ x: 0, y: 0 })
    expect(pointerRatio(300, 100, box)).toEqual({ x: 1, y: -1 })
    expect(pointerRatio(900, -50, box)).toEqual({ x: 1, y: -1 })
  })

  it('never pulls a magnetic button more than 8px, corners included', () => {
    const corner = magneticPull({ x: 1, y: 1 })
    expect(Math.hypot(corner.x, corner.y)).toBeCloseTo(8)
    expect(magneticPull({ x: 0.5, y: 0 })).toEqual({ x: 4, y: 0 })
  })
})

describe('CountUp formatting', () => {
  it('uses Indian grouping with Latin digits in both languages', () => {
    const inr = { style: 'currency', currency: 'INR', maximumFractionDigits: 0 } as const
    expect(numberFormat('en', inr).format(100000)).toBe('₹1,00,000')
    expect(numberFormat('hi', inr).format(100000)).toBe('₹1,00,000')
    expect(numberFormat('hi').format(1234567)).toBe('12,34,567')
  })

  it('rounds frames to the target precision and ends exactly on it', () => {
    expect(countFrame(12500, 0.33333)).toBe(4167)
    expect(countFrame(0.5, 0.999)).toBe(0.5)
    expect(countFrame(0.999, 1)).toBe(0.999)
  })
})
