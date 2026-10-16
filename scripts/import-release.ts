/**
 * Imports a VYRO release from GitHub (nanu1605/vyro-releases) as an installer + release, so the
 * download page and the Tauri update feed serve it (spec §12.5).
 *
 *   pnpm payload run scripts/import-release.ts [tag]        # tag: v0.3.0, default: latest
 *   pnpm payload run scripts/import-release.ts v0.3.0 -- --publish   # or PUBLISH=1
 *
 * `payload run` loads .env and passes on positional arguments only (it swallows flags), so
 * `--publish` must come after `--`. GITHUB_TOKEN (optional) raises the API rate limit.
 *
 * Downloads go to a fresh temp directory that is deleted at the end; they are only hashed and
 * uploaded, never opened or run. The installer must match SHA256SUMS.txt (and GitHub's digest)
 * and latest.json must carry a windows-x86_64 signature, or nothing is written. Re-running for
 * an imported version changes nothing. The release stays a draft unless publishing is asked
 * for: the Owner decides when a VYRO download goes live.
 *
 * Publishing here serves the release in the update feed and /api/v1/downloads/vyro/latest at once, but
 * this process can't expire the site's cached pages (the download page shows it after the next
 * deploy or release save). Publishing in the admin does both.
 */
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  findAsset,
  githubRelease,
  MANIFEST,
  parseManifest,
  parseSha256Sums,
  PRODUCT_SLUG,
  releaseVersion,
  REPO,
  saveRelease,
  SUMS,
  verifySha256,
  type Asset,
} from './import-release/release'

const MAX_INSTALLER_BYTES = 512 * 1024 * 1024 // the installers upload limit
const MAX_TEXT_BYTES = 64 * 1024
const UA = 'jainav-release-import'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2).map(String),
  options: { publish: { type: 'boolean', default: false } },
  allowPositionals: true,
})
const tag = positionals[0] ?? 'latest'
const publish = values.publish || process.env.PUBLISH === '1'
if (tag !== 'latest' && !/^v?\d+\.\d+\.\d+[\w.+-]*$/.test(tag)) {
  throw new Error(`Not a release tag: ${tag}`)
}

// Connect first: a database error must not leave a temp directory behind.
const payload = await getPayload({ config })

const token = process.env.GITHUB_TOKEN
const res = await fetch(
  `https://api.github.com/repos/${REPO}/releases/${tag === 'latest' ? 'latest' : `tags/${tag}`}`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': UA,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal: AbortSignal.timeout(30_000),
  },
)
if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${REPO} release ${tag}.`)
const release = githubRelease.parse(await res.json())
const { version, channel } = releaseVersion(release)

/** Downloads a release asset into `dir` and returns its bytes (size checked). */
async function download(asset: Asset, dir: string, maxBytes: number): Promise<Buffer> {
  if (asset.size > maxBytes)
    throw new Error(`${asset.name} is ${asset.size} bytes, over the limit.`)
  if (!asset.browser_download_url.startsWith(`https://github.com/${REPO}/releases/download/`)) {
    throw new Error(`${asset.name} is not hosted on ${REPO}: ${asset.browser_download_url}`)
  }
  const file = await fetch(asset.browser_download_url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10 * 60_000),
  })
  if (!file.ok) throw new Error(`Downloading ${asset.name} failed with ${file.status}.`)
  const data = Buffer.from(await file.arrayBuffer())
  if (data.length !== asset.size) {
    throw new Error(`${asset.name}: got ${data.length} bytes, GitHub lists ${asset.size}.`)
  }
  await writeFile(path.join(dir, asset.name), data)
  return data
}

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')

const dir = await mkdtemp(path.join(os.tmpdir(), 'vyro-release-'))
try {
  const sumsAsset = findAsset(release, SUMS)
  const sums = parseSha256Sums((await download(sumsAsset, dir, MAX_TEXT_BYTES)).toString('utf8'))
  const manifestAsset = findAsset(release, MANIFEST)
  const manifestBytes = await download(manifestAsset, dir, MAX_TEXT_BYTES)
  if (sums.has(MANIFEST)) verifySha256(sums, manifestAsset, sha256(manifestBytes))
  const update = parseManifest(JSON.parse(manifestBytes.toString('utf8')), version)

  const installer = findAsset(release, update.installerName)
  const hash = sha256(await download(installer, dir, MAX_INSTALLER_BYTES))
  verifySha256(sums, installer, hash)
  console.log(`Verified ${installer.name} (${installer.size} bytes) SHA-256 ${hash}`)

  const releasedAt = update.pubDate ?? release.published_at
  if (!releasedAt) throw new Error(`Release ${release.tag_name} has no date.`)

  const result = await saveRelease(payload, {
    productSlug: PRODUCT_SLUG,
    version,
    channel,
    releasedAt,
    notes: release.body?.trim() || update.notes,
    signature: update.signature,
    sha256: hash,
    installerPath: path.join(dir, installer.name),
    publish,
  })
  console.log(
    `${PRODUCT_SLUG} ${version} (${channel}): installer #${result.installerId} ${result.installer}, release #${result.releaseId} ${result.release}.`,
  )
  if (result.release === 'unchanged') console.log('Already imported: nothing changed.')
  else if (publish) {
    console.log(
      'Published: the update feed serves it now; cached pages refresh on the next deploy.',
    )
  } else console.log('Saved as a draft: the Owner publishes it in the admin.')
} finally {
  await rm(dir, { recursive: true, force: true })
}
