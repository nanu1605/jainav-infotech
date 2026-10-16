import { NextIntlClientProvider } from 'next-intl'
import { createElement, type ComponentProps } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { VyroGauges } from '@/components/product/animations/VyroGauges'
import {
  CAP,
  SCRIPT,
  SWEEP,
  coverFor,
  graphPaths,
  turn,
} from '@/components/product/animations/vyro/script'

describe('VYRO gauges', () => {
  it.each(['cpu', 'gpu'] as const)(
    '%s: the cover hides the value arc past every reading without wrapping onto its start',
    (key) => {
      const { end, length } = coverFor(key)
      expect(end + CAP).toBeLessThanOrEqual(SWEEP) // the arc's round end stays inside the clip
      for (const s of SCRIPT) {
        const at = turn(s[key])
        expect(at + length).toBeGreaterThanOrEqual(end + CAP)
        expect(at + length).toBeLessThanOrEqual(360)
      }
    },
  )

  it('graph loops seamlessly: two periods, the last point repeats the first', () => {
    const { line } = graphPaths(SCRIPT.map((s) => s.temp))
    const points = line.slice(1).split('L')
    expect(points).toHaveLength(2 * SCRIPT.length + 1)
    expect(points.at(-1)?.split(' ')[1]).toBe(points[0]?.split(' ')[1])
  })

  it('server-renders the first sample as a labelled still frame', () => {
    const intl: ComponentProps<typeof NextIntlClientProvider> = {
      locale: 'en',
      messages: { ui: { demo: { vyro: { label: 'VYRO demo' } } } },
      onError: () => {},
      children: createElement(VyroGauges),
    }
    const html = renderToString(createElement(NextIntlClientProvider, intl))
    expect(html).toContain('role="img" aria-label="VYRO demo"')
    expect(html).toContain('data-theme="dark"')
    const first = SCRIPT[0]!
    expect(html).toContain(`--turn:${turn(first.cpu)}deg`)
    expect(html).toContain(`data-key="cpuMhz">4,620<`)
    expect(html).toMatch(new RegExp(`data-key="temp"[^>]*>${first.temp}<`))
  })
})
