import semver from 'semver'

export type Channel = 'stable' | 'beta'
export const DEFAULT_PLATFORM = 'windows-x86_64'

type ReleaseLike = { version: string; channel: Channel; platform: string }

/** Newest release (by semver, not date) on a channel and platform. */
export function latestRelease<R extends ReleaseLike>(
  releases: R[],
  {
    channel = 'stable',
    platform = DEFAULT_PLATFORM,
  }: { channel?: Channel; platform?: string } = {},
): R | null {
  let best: R | null = null
  for (const r of releases) {
    if (r.channel !== channel || r.platform !== platform || !semver.valid(r.version)) continue
    if (!best || semver.gt(r.version, best.version)) best = r
  }
  return best
}

/**
 * Tauri v2 update check (spec §12.5): the newest release for `${target}-${arch}` on the channel
 * with a higher semver than the installed version, or null (→ 204). Invalid input → null.
 */
export function updateFor<R extends ReleaseLike>(
  releases: R[],
  q: { target: string; arch: string; current: string; channel?: Channel },
): R | null {
  const current = semver.valid(q.current)
  if (!current) return null
  const latest = latestRelease(releases, {
    channel: q.channel,
    platform: `${q.target}-${q.arch}`.toLowerCase(),
  })
  return latest && semver.gt(latest.version, current) ? latest : null
}

export const isChannel = (value: string | null): value is Channel =>
  value === 'stable' || value === 'beta'
