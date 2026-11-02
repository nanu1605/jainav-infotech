import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

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

describe('check:migrations', () => {
  // The real command, on a folder of its own: one migration the index has, one it doesn't.
  it('fails on a migration file missing from the index', { timeout: 120_000 }, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'migrations-'))
    try {
      for (const file of [
        '20261015_154806_initial.ts',
        '20261015_154806_initial.json',
        '20990101_000000_forgotten.ts',
        'index.ts',
      ]) {
        writeFileSync(path.join(dir, file), '')
      }
      const { status, stderr } = spawnSync(`pnpm check:migrations "${dir}"`, {
        encoding: 'utf8',
        shell: true,
      })
      expect(stderr).toMatch(/is missing:\n {2}20990101_000000_forgotten\n/)
      expect(status).toBe(1)
    } finally {
      rmSync(dir, { recursive: true })
    }
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
