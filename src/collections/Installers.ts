import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type FieldAccess,
} from 'payload'
import { extractID } from 'payload/shared'

import { anyone, contentEditors, ownerOnly } from '@/access/roles'
import { semver } from '@/fields/validators'

// Stored type per extension: browsers send varying Content-Types (often octet-stream for .msi).
// The stored mimeType also becomes the bucket object's Content-Type.
const MIME_BY_EXT: Record<string, string> = {
  exe: 'application/x-msdownload',
  msi: 'application/x-msi',
}

/** Computed from the uploaded file; never accepted from the API. */
const computed: FieldAccess = () => false

/**
 * Runs only when a file is uploaded, so metadata edits and the storage plugin's follow-up update
 * keep the stored hash and object location (the bucket object is never moved).
 */
const processInstaller: CollectionBeforeChangeHook = async ({ data, req }) => {
  const file = req.file
  if (!file) return data

  // application/x-cfb (the sniffed type of .msi) also matches legacy Office files.
  const mimeType = MIME_BY_EXT[file.name.split('.').pop()?.toLowerCase() ?? '']
  if (!mimeType) throw new APIError('Only .exe and .msi installers can be uploaded.', 400)
  data.mimeType = mimeType

  // With `upload.useTempFiles` the bytes are on disk and `file.data` is empty.
  const hash = createHash('sha256')
  if (file.data.length > 0) {
    hash.update(file.data)
  } else if (file.tempFilePath) {
    for await (const chunk of createReadStream(file.tempFilePath)) hash.update(chunk as Buffer)
  } else {
    throw new APIError('Uploaded file content is unavailable for hashing.', 500)
  }
  data.sha256 = hash.digest('hex')

  const product = data.product as number | { id: number } | null | undefined
  if (product != null && typeof data.version === 'string') {
    const { slug } = (await req.payload.findByID({
      collection: 'products',
      id: extractID(product),
      depth: 0,
      overrideAccess: true,
      req,
    })) as { slug?: string | null }
    // The storage plugin keeps a prefix already under its collection prefix as is.
    if (slug) data.prefix = `downloads/${slug}/${data.version}`
  }
  return data
}

/**
 * Installer files are immutable: a published release must keep shipping the bytes the Owner
 * approved, with a matching SHA-256 and update signature. A new build is a new installer.
 * The storage plugin's own follow-up update runs with overrideAccess and no file, so it passes.
 */
const noFileReplacement: CollectionBeforeOperationHook = ({
  args,
  operation,
  overrideAccess,
  req,
}) => {
  if (operation === 'update' && req.file && !overrideAccess) {
    throw new APIError(
      'Installers can’t be replaced. Upload a new installer and attach it to a release.',
      400,
    )
  }
  return args
}

/** A release must never point at a deleted file while it is still listed. */
const keepIfReleased: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'releases',
    where: { installer: { equals: id } },
    overrideAccess: true,
    req,
  })
  if (totalDocs)
    throw new APIError('Detach this installer from its releases before deleting it.', 409)
}

export const Installers: CollectionConfig = {
  slug: 'installers',
  admin: {
    group: 'Products',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'product', 'version', 'filesize', 'updatedAt'],
    listSearchableFields: ['filename', 'version'],
    description:
      'Windows installers (.exe / .msi). The SHA-256 is computed on upload; attach the file to a release to ship it.',
  },
  access: {
    read: anyone,
    create: contentEditors,
    update: contentEditors,
    delete: ownerOnly,
  },
  upload: {
    // The type is sniffed from the bytes and must start with one of these. Listing types lifts
    // Payload's built-in exe/msi ban; never set allowRestrictedFileTypes (it skips the sniff).
    mimeTypes: [
      'application/x-msdownload', // sniffed .exe
      'application/x-cfb', // sniffed .msi
      'application/x-msi',
      'application/x-ole-storage',
      'application/x-ms-dos-executable',
      'application/x-dosexec',
      'application/vnd.microsoft.portable-executable',
      'application/octet-stream',
      '.exe', // the two extensions only widen the admin file picker
      '.msi',
    ],
    focalPoint: false,
    crop: false,
    // Bulk upload checks File.type in the browser, which is often empty for .msi.
    bulkUpload: false,
  },
  hooks: {
    beforeOperation: [noFileReplacement],
    beforeChange: [processInstaller],
    beforeDelete: [keepIfReleased],
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'version', type: 'text', required: true, validate: semver },
    {
      name: 'sha256',
      label: 'SHA-256',
      type: 'text',
      index: true,
      access: { create: computed, update: computed },
      admin: { readOnly: true },
    },
  ],
}
