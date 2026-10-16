import { describe, expect, it } from 'vitest'

import {
  findAsset,
  githubRelease,
  parseManifest,
  parseSha256Sums,
  releaseVersion,
  verifySha256,
} from '../../scripts/import-release/release'

const MSI = 'Vyro_0.3.0_x64_en-US.msi'
const HASH = '0dacbbaae9bf0b17d0a9306ed750170afef05826bad26a00d11f60df2b425dd3'
const SIG = Buffer.from(
  'untrusted comment: signature from tauri secret key\nRUS2KAvLfpCXk5XXOO382k5E\ntrusted comment: timestamp:1792041531\tfile:Vyro_0.3.0_x64_en-US.msi\n',
).toString('base64')

const manifest = (over: Record<string, unknown> = {}) => ({
  version: '0.3.0',
  notes: 'Vyro 0.3.0',
  pub_date: '2026-10-15T05:18:51Z',
  platforms: {
    'windows-x86_64': {
      url: `https://github.com/nanu1605/vyro-releases/releases/download/v0.3.0/${MSI}`,
      signature: SIG,
    },
  },
  ...over,
})

const release = githubRelease.parse({
  tag_name: 'v0.3.0',
  body: 'Vyro 0.3.0 for Windows 10/11 (x64).',
  prerelease: false,
  published_at: '2026-10-15T05:18:58Z',
  assets: [
    {
      name: MSI,
      size: 10403840,
      browser_download_url: `https://github.com/nanu1605/vyro-releases/releases/download/v0.3.0/${MSI}`,
      digest: `sha256:${HASH}`,
    },
  ],
})

describe('parseSha256Sums', () => {
  it('reads sha256sum output with CRLF, text and binary markers', () => {
    const sums = parseSha256Sums(
      `${'a'.repeat(64)}  latest.json\r\n${HASH.toUpperCase()} *${MSI}\r\n\r\n`,
    )
    expect(sums.get('latest.json')).toBe('a'.repeat(64))
    expect(sums.get(MSI)).toBe(HASH)
  })

  it('rejects malformed lines and conflicting duplicates', () => {
    expect(() => parseSha256Sums(`${HASH} ${MSI}`)).toThrow(/Malformed/)
    expect(() => parseSha256Sums(`abc  ${MSI}`)).toThrow(/Malformed/)
    expect(() => parseSha256Sums(`${HASH}  ${MSI}\n${'b'.repeat(64)}  ${MSI}`)).toThrow(/twice/)
  })
})

describe('verifySha256', () => {
  const asset = findAsset(release, MSI)
  const sums = new Map([[MSI, HASH]])

  it('passes a matching hash and GitHub digest', () => {
    expect(() => verifySha256(sums, asset, HASH)).not.toThrow()
  })

  it('aborts on a mismatch, a missing entry or a different GitHub digest', () => {
    expect(() => verifySha256(sums, asset, 'f'.repeat(64))).toThrow(/mismatch/)
    expect(() => verifySha256(new Map(), asset, HASH)).toThrow(/no entry/)
    const other = { ...asset, digest: `sha256:${'f'.repeat(64)}` }
    expect(() => verifySha256(sums, other, HASH)).toThrow(/digest/)
  })
})

describe('parseManifest (Tauri latest.json)', () => {
  it('returns the windows-x86_64 installer name and signature', () => {
    expect(parseManifest(manifest(), '0.3.0')).toEqual({
      installerName: MSI,
      signature: SIG,
      notes: 'Vyro 0.3.0',
      pubDate: '2026-10-15T05:18:51Z',
    })
  })

  it('rejects another version, a missing platform, a bad signature or installer name', () => {
    expect(() => parseManifest(manifest(), '1.0.0')).toThrow(/not 1.0.0/)
    expect(() => parseManifest(manifest({ platforms: {} }), '0.3.0')).toThrow(/no windows/)
    const entry = (signature: string, url = manifest().platforms['windows-x86_64'].url) =>
      manifest({ platforms: { 'windows-x86_64': { url, signature } } })
    expect(() => parseManifest(entry(''), '0.3.0')).toThrow(/base64/)
    expect(() => parseManifest(entry(`${SIG.slice(0, -4)}$$$$`), '0.3.0')).toThrow(/base64/)
    expect(() =>
      parseManifest(entry(SIG, 'https://example.com/a/..%2F..%2Fx.msi'), '0.3.0'),
    ).toThrow(/installer name/)
    expect(() => parseManifest(entry(SIG, 'https://example.com/setup.zip'), '0.3.0')).toThrow(
      /installer name/,
    )
    expect(() => parseManifest({ version: '0.3.0' }, '0.3.0')).toThrow()
  })
})

describe('releaseVersion and findAsset', () => {
  it('maps the tag to a semver version and pre-releases to beta', () => {
    expect(releaseVersion(release)).toEqual({ version: '0.3.0', channel: 'stable' })
    expect(releaseVersion({ ...release, tag_name: '1.0.0-rc.1', prerelease: true })).toEqual({
      version: '1.0.0-rc.1',
      channel: 'beta',
    })
    expect(() => releaseVersion({ ...release, tag_name: 'nightly' })).toThrow(/semver/)
  })

  it('aborts when an asset is missing', () => {
    expect(() => findAsset(release, 'SHA256SUMS.txt')).toThrow(/no SHA256SUMS.txt/)
  })
})
