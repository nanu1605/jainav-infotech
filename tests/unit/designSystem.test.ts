import { describe, expect, it } from 'vitest'

import { accentVars, contrast } from '@/lib/accent'
import { segmentWords } from '@/lib/segment'
import { tokens } from '@/styles/tokens.generated'

describe('segmentWords', () => {
  it('splits English into words and keeps the text intact', () => {
    const words = segmentWords('Know your machine.', 'en')
    expect(words).toEqual(['Know ', 'your ', 'machine.'])
    expect(words.join('')).toBe('Know your machine.')
  })

  it('never splits inside a Devanagari word (matras and conjuncts stay whole)', () => {
    const text = 'सॉफ़्टवेयर जो हम बनाते हैं।'
    const words = segmentWords(text, 'hi')
    expect(words.join('')).toBe(text)
    expect(words.map((w) => w.trim())).toEqual(['सॉफ़्टवेयर', 'जो', 'हम', 'बनाते', 'हैं।'])
  })
})

describe('accentVars', () => {
  it('picks the text color with more contrast on the accent', () => {
    for (const accent of ['#0891B2', '#EA580C', '#9333EA', '#FDE047', '#111827']) {
      const fg = accentVars(accent)['--product-accent-fg']!
      const other = fg === tokens.light.fg ? tokens.light['fg-inverse'] : tokens.light.fg
      expect(contrast(accent, fg)).toBeGreaterThanOrEqual(contrast(accent, other))
    }
  })

  it('uses a faint accent only decoratively', () => {
    expect(accentVars('#FDE047')['--product-accent-text']).toBe('var(--fg)')
  })

  it('ignores anything that is not #RRGGBB', () => {
    expect(accentVars('red')).toEqual({})
    expect(accentVars(null)).toEqual({})
  })
})
