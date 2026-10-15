import { describe, expect, it } from 'vitest'

import { missingKeys } from '../../scripts/check-i18n'
import { findTokenViolations } from '../../scripts/check-tokens'
import { buildTokens } from '../../scripts/tokens-build'
import { brandConfig, semanticColorNames, type BrandConfig } from '@/styles/brand.config'

describe('check:tokens', () => {
  it.each([
    ['<div style={{ color: "#fff" }} />', 'hex color literal'],
    ['color: rgb(0 0 0);', 'color function literal'],
    ['color: oklch(0.5 0.1 200);', 'color function literal'],
    ['<p className="bg-red-500" />', 'Tailwind default palette class'],
    ['<p className="hover:text-white" />', 'Tailwind default palette class'],
    ['<p className="bg-black/50" />', 'Tailwind default palette class'],
    ['<p className="bg-[#123456]" />', 'arbitrary color value'],
  ])('flags %s', (line, label) => {
    expect(findTokenViolations(line, 'x.tsx').join()).toContain(label)
  })

  it.each([
    '<p className="bg-primary text-primary-fg border-border-strong" />',
    '<a href="#main">skip</a>',
    '<p className="bg-brand-accent text-fg-muted shadow-md" />',
    'background: var(--bg);',
  ])('allows %s', (line) => {
    expect(findTokenViolations(line, 'x.tsx')).toEqual([])
  })
})

describe('check:i18n', () => {
  it('reports keys missing from hi', () => {
    const en = { a: 'A', nested: { b: 'B', c: 'C' } }
    const hi = { a: 'अ', nested: { b: 'ब' } }
    expect(missingKeys(en, hi)).toEqual(['nested.c'])
  })

  it('passes when hi has every key', () => {
    expect(missingKeys({ a: 'A' }, { a: 'अ' })).toEqual([])
  })
})

describe('tokens:build', () => {
  it('builds the current brand config with every contrast pair passing', () => {
    const { css, failures } = buildTokens(brandConfig)
    expect(failures).toEqual([])
    for (const token of semanticColorNames) expect(css).toContain(`--${token}:`)
    expect(css).toContain("[data-theme='dark']")
  })

  it('fails when a pair misses its contrast target', () => {
    const bad: BrandConfig = structuredClone(brandConfig)
    bad.light.colors['primary-fg'] = 'brand.500'
    const { failures } = buildTokens(bad)
    expect(failures.some((f) => f.startsWith('light: --primary-fg on --primary'))).toBe(true)
  })
})
