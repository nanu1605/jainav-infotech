/**
 * Importing a VYRO release from GitHub (spec §12.5): the pure checks on GitHub's JSON, the Tauri
 * `latest.json` and `SHA256SUMS.txt`, and the idempotent CMS writes. The network and temp-file
 * side lives in scripts/import-release.ts.
 */
import type { Payload } from 'payload'
import semver from 'semver'
import { z } from 'zod'

export const REPO = 'nanu1605/vyro-releases'
export const PRODUCT_SLUG = 'vyro'
/** Tauri's `${target}-${arch}` key in latest.json, and the release's `platform`. */
export const PLATFORM = 'windows-x86_64'
export const MANIFEST = 'latest.json'
export const SUMS = 'SHA256SUMS.txt'

const asset = z.object({
  name: z.string(),
  size: z.number().int().nonnegative(),
  browser_download_url: z.url({ protocol: /^https$/ }),
  digest: z.string().nullish(),
})
export type Asset = z.infer<typeof asset>

/** GET /repos/{repo}/releases/{latest | tags/:tag}, only the fields used here. */
export const githubRelease = z.object({
  tag_name: z.string(),
  body: z.string().nullish(),
  prerelease: z.boolean(),
  published_at: z.iso.datetime({ offset: true }).nullish(),
  assets: z.array(asset),
})
export type GithubRelease = z.infer<typeof githubRelease>

const manifest = z.object({
  version: z.string(),
  notes: z.string().nullish(),
  pub_date: z.iso.datetime({ offset: true }).nullish(),
  platforms: z.record(z.string(), z.object({ url: z.url(), signature: z.string() })),
})

// A downloaded file is written under this name: no separators, no dot-only names.
const SAFE_NAME = /^[A-Za-z0-9][\w.-]*$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

export function findAsset(release: GithubRelease, name: string): Asset {
  const found = release.assets.find((a) => a.name === name)
  if (!found) throw new Error(`Release ${release.tag_name} has no ${name} asset.`)
  return found
}

/** The version and channel of a GitHub release (a GitHub pre-release → beta). */
export function releaseVersion(release: GithubRelease) {
  const version = semver.valid(release.tag_name.replace(/^v/, ''))
  if (!version) throw new Error(`Tag ${release.tag_name} is not a semver version.`)
  return { version, channel: release.prerelease ? ('beta' as const) : ('stable' as const) }
}

/** `sha256sum` output ("<hex>  <name>" or "<hex> *<name>") → name → lowercase hex. */
export function parseSha256Sums(text: string): Map<string, string> {
  const sums = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const m = /^([0-9a-fA-F]{64}) [ *](.+)$/.exec(line.trimEnd())
    if (!m) throw new Error(`Malformed ${SUMS} line: ${JSON.stringify(line.slice(0, 120))}`)
    const [, hex, name] = m as unknown as [string, string, string]
    if (sums.has(name) && sums.get(name) !== hex.toLowerCase()) {
      throw new Error(`${SUMS} lists ${name} twice with different hashes.`)
    }
    sums.set(name, hex.toLowerCase())
  }
  return sums
}

/** Throws unless `sha256` matches the file's SHA256SUMS entry (and GitHub's digest, if any). */
export function verifySha256(sums: Map<string, string>, file: Asset, sha256: string) {
  const expected = sums.get(file.name)
  if (!expected) throw new Error(`${SUMS} has no entry for ${file.name}.`)
  if (expected !== sha256) {
    throw new Error(`SHA-256 mismatch for ${file.name}: expected ${expected}, got ${sha256}.`)
  }
  if (file.digest && file.digest !== `sha256:${sha256}`) {
    throw new Error(`${file.name} does not match GitHub's digest ${file.digest}.`)
  }
}

/** The Windows update entry of a Tauri v2 latest.json, checked against the release version. */
export function parseManifest(json: unknown, version: string) {
  const m = manifest.parse(json)
  if (semver.valid(m.version) !== version) {
    throw new Error(`${MANIFEST} is for version ${m.version}, not ${version}.`)
  }
  const entry = m.platforms[PLATFORM]
  if (!entry) throw new Error(`${MANIFEST} has no ${PLATFORM} entry.`)
  // The .sig contents: base64 of minisign text. Tauri verifies it against the installer.
  const signature = entry.signature.trim()
  if (signature.length < 100 || signature.length % 4 || !BASE64.test(signature)) {
    throw new Error(`The ${PLATFORM} updater signature is not base64 text.`)
  }
  const installerName = decodeURIComponent(new URL(entry.url).pathname.split('/').pop() ?? '')
  if (!SAFE_NAME.test(installerName) || !/\.(msi|exe)$/i.test(installerName)) {
    throw new Error(`Unexpected installer name in ${MANIFEST}: ${JSON.stringify(installerName)}.`)
  }
  return { installerName, signature, notes: m.notes ?? null, pubDate: m.pub_date ?? null }
}

export type ImportInput = {
  productSlug: string
  version: string
  channel: 'stable' | 'beta'
  releasedAt: string
  notes: string | null
  signature: string
  /** Verified SHA-256 of the file at installerPath. */
  sha256: string
  installerPath: string
  publish: boolean
}

export type ImportResult = {
  installer: 'created' | 'existing'
  release: 'created' | 'published' | 'unchanged'
  installerId: number
  releaseId: number
}

// payload run has no Next request, so revalidation can't reach a running server (see the
// script's notes); skip it as the seed does.
const context = { disableRevalidate: true }

/**
 * Creates the installer upload and the release for one version, or leaves them as they are.
 * Never replaces anything: an existing release with another file or signature aborts.
 */
export async function saveRelease(payload: Payload, input: ImportInput): Promise<ImportResult> {
  const products = await payload.find({
    collection: 'products',
    where: { slug: { equals: input.productSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const product = products.docs[0]
  if (!product) throw new Error(`No product with the slug "${input.productSlug}".`)

  const releases = await payload.find({
    collection: 'releases',
    where: {
      product: { equals: product.id },
      platform: { equals: PLATFORM },
      version: { equals: input.version },
    },
    draft: true,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const existing = releases.docs[0]
  if (existing) {
    if (existing.sha256 !== input.sha256 || existing.updaterSignature.trim() !== input.signature) {
      throw new Error(
        `Release ${input.version} (#${existing.id}) already exists with a different installer or signature; nothing changed.`,
      )
    }
    const installerId =
      typeof existing.installer === 'object' ? existing.installer.id : existing.installer
    if (!input.publish || existing._status === 'published') {
      return { installer: 'existing', release: 'unchanged', installerId, releaseId: existing.id }
    }
    await payload.update({
      collection: 'releases',
      id: existing.id,
      data: { _status: 'published' },
      depth: 0,
      overrideAccess: true,
      context,
    })
    return { installer: 'existing', release: 'published', installerId, releaseId: existing.id }
  }

  const installers = await payload.find({
    collection: 'installers',
    where: {
      product: { equals: product.id },
      version: { equals: input.version },
      sha256: { equals: input.sha256 },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let installer = installers.docs[0]
  const installerState = installer ? 'existing' : 'created'
  if (!installer) {
    installer = await payload.create({
      collection: 'installers',
      data: { product: product.id, version: input.version },
      filePath: input.installerPath,
      depth: 0,
      overrideAccess: true,
      context,
    })
    // The upload hook hashes the stored bytes itself.
    if (installer.sha256 !== input.sha256) {
      throw new Error(`Stored installer #${installer.id} hashes to ${installer.sha256}.`)
    }
  }

  const release = await payload.create({
    collection: 'releases',
    draft: !input.publish,
    data: {
      product: product.id,
      version: input.version,
      channel: input.channel,
      platform: PLATFORM,
      releasedAt: input.releasedAt,
      installer: installer.id,
      updaterSignature: input.signature,
      notes: input.notes,
      _status: input.publish ? 'published' : 'draft',
    },
    locale: 'en',
    depth: 0,
    overrideAccess: true,
    context,
  })
  return {
    installer: installerState,
    release: 'created',
    installerId: installer.id,
    releaseId: release.id,
  }
}
