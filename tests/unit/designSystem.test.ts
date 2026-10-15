import { describe, expect, it } from 'vitest'

import { accentVars, contrast } from '@/lib/accent'
import { tokens } from '@/styles/tokens.generated'

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
