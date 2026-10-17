import { DEFAULT_PLATFORM, latestRelease } from '@/lib/releases'

type ReleaseLike = Parameters<typeof latestRelease>[0][number]

/** The newest stable release of each platform, the default platform (Windows x64) first. */
export function latestPerPlatform<R extends ReleaseLike>(releases: R[]): R[] {
  const platforms = [...new Set(releases.map((r) => r.platform))].sort((a, b) =>
    a === DEFAULT_PLATFORM ? -1 : b === DEFAULT_PLATFORM ? 1 : a.localeCompare(b),
  )
  return platforms
    .map((platform) => latestRelease(releases, { platform }))
    .filter((r): r is R => r !== null)
}

/** `windows-x86_64` → `{ os: 'windows', arch: 'x86_64' }`; Tauri names macOS `darwin`. */
export function platformParts(platform: string) {
  const [target = '', ...arch] = platform.split('-')
  return { os: target === 'darwin' ? 'macos' : target, arch: arch.join('-') }
}
