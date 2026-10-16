import { describe, expect, it } from 'vitest'

import { latestRelease, updateFor } from '@/lib/releases'

const r = (
  version: string,
  channel: 'stable' | 'beta' = 'stable',
  platform = 'windows-x86_64',
) => ({
  version,
  channel,
  platform,
})
const releases = [
  r('1.2.0'),
  r('1.10.0'), // newer than 1.2.0 by semver, though it sorts lower as text
  r('1.9.5'),
  r('2.0.0-beta.1', 'beta'),
  r('3.0.0', 'stable', 'windows-aarch64'),
]

describe('latestRelease', () => {
  it('picks the newest by semver on the channel and platform', () => {
    expect(latestRelease(releases)?.version).toBe('1.10.0')
    expect(latestRelease(releases, { channel: 'beta' })?.version).toBe('2.0.0-beta.1')
    expect(latestRelease(releases, { platform: 'windows-aarch64' })?.version).toBe('3.0.0')
    expect(latestRelease(releases, { platform: 'linux-x86_64' })).toBeNull()
  })
})

describe('updateFor (Tauri v2 feed, spec §12.5)', () => {
  const q = { target: 'windows', arch: 'x86_64' }

  it('returns the newest higher version (→ 200)', () => {
    expect(updateFor(releases, { ...q, current: '1.2.0' })?.version).toBe('1.10.0')
    expect(updateFor(releases, { ...q, current: '1.9.9' })?.version).toBe('1.10.0')
  })

  it('returns null when up to date, ahead, or the version is invalid (→ 204)', () => {
    expect(updateFor(releases, { ...q, current: '1.10.0' })).toBeNull()
    expect(updateFor(releases, { ...q, current: '9.0.0' })).toBeNull()
    expect(updateFor(releases, { ...q, current: 'latest' })).toBeNull()
  })

  it('defaults to stable; beta only sees beta releases', () => {
    expect(updateFor(releases, { ...q, current: '1.10.0', channel: 'beta' })?.version).toBe(
      '2.0.0-beta.1',
    )
    expect(updateFor(releases, { ...q, current: '2.0.0-beta.1', channel: 'beta' })).toBeNull()
  })

  it('matches target and arch case-insensitively', () => {
    expect(
      updateFor(releases, { target: 'Windows', arch: 'X86_64', current: '1.0.0' })?.version,
    ).toBe('1.10.0')
    expect(updateFor(releases, { target: 'darwin', arch: 'x86_64', current: '1.0.0' })).toBeNull()
  })
})

describe('docPaths', () => {
  it('builds nested paths and drops broken or looping chains', async () => {
    const { docPaths } = await import('@/lib/routes')
    const paths = docPaths([
      { id: 1, slug: 'start', parent: null },
      { id: 2, slug: 'install', parent: 1 },
      { id: 3, slug: 'windows', parent: { id: 2 } },
      { id: 4, slug: 'orphan', parent: 99 },
      { id: 5, slug: 'a', parent: 6 },
      { id: 6, slug: 'b', parent: 5 },
    ])
    expect(paths.get(3)).toEqual(['start', 'install', 'windows'])
    expect(paths.get(1)).toEqual(['start'])
    expect(paths.has(4)).toBe(false)
    expect(paths.has(5)).toBe(false)
  })
})
