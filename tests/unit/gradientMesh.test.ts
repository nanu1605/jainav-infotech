import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GradientMesh } from '@/components/motion/GradientMesh'

describe('GradientMesh', () => {
  it('server-renders the still frame: hidden from assistive tech, gradients painted, no pointer state', () => {
    const html = renderToString(createElement(GradientMesh))
    expect(html).toMatch(/^<div aria-hidden="true"/)
    expect(html).toContain('bg-(image:--gradient-3)')
    expect(html).toContain('bg-(image:--gradient-1)')
    expect(html.match(/mesh-blob/g)).toHaveLength(3)
    // Pointer offsets and pause state exist only after hydration, set by the effect.
    expect(html).not.toContain('--mesh-')
  })
})
