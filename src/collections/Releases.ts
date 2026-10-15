import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldAccess,
  TextFieldSingleValidation,
  Where,
} from 'payload'
import { extractID, text as validateText } from 'payload/shared'

import { draftsUnlessOwner, ownerPublishesOnly } from '@/access/publishGate'
import { ownerOnly, publishedOrStaff, staff } from '@/access/roles'
import { semver } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'

type ID = number | { id: number }

// Matched against the Tauri update request `${target}-${arch}` (spec §12.5).
const tauriPlatform: TextFieldSingleValidation = (value, options) =>
  value && !/^[a-z0-9]+-[a-z0-9_]+$/.test(value)
    ? 'Use <target>-<arch> in lowercase, e.g. windows-x86_64'
    : validateText(value, options)

/** Computed from the installer; never accepted from the API. */
const computed: FieldAccess = () => false

const copyInstallerFacts: CollectionBeforeChangeHook = async ({ data, req }) => {
  const installer = data.installer as ID | null | undefined
  if (installer == null) return data
  const { sha256, filesize } = (await req.payload.findByID({
    collection: 'installers',
    id: extractID(installer),
    depth: 0,
    overrideAccess: true,
    req,
  })) as { sha256?: string | null; filesize?: number | null }
  data.sha256 = sha256 ?? null
  data.sizeBytes = filesize ?? null
  return data
}

export const Releases: CollectionConfig = {
  slug: 'releases',
  admin: {
    group: 'Products',
    useAsTitle: 'version',
    defaultColumns: ['version', 'product', 'channel', 'platform', 'releasedAt', '_status'],
    listSearchableFields: ['version', 'platform'],
    description:
      'Editors save drafts; only the Owner publishes. Publishing pushes this update to every installed copy through the update feed. Unpublish to pull a bad release.',
  },
  defaultSort: '-releasedAt',
  versions: { drafts: true, maxPerDoc: 50 },
  indexes: [{ fields: ['product', 'platform', 'version'], unique: true }],
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: draftsUnlessOwner,
    update: draftsUnlessOwner,
    delete: ownerOnly,
  },
  hooks: {
    beforeOperation: [ownerPublishesOnly],
    beforeChange: [copyInstallerFacts],
    ...revalidateCollection({ tag: 'releases' }),
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'version',
          type: 'text',
          required: true,
          validate: semver,
          admin: { width: '34%' },
        },
        {
          name: 'channel',
          type: 'select',
          required: true,
          defaultValue: 'stable',
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Beta', value: 'beta' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'platform',
          type: 'text',
          required: true,
          defaultValue: 'windows-x86_64',
          validate: tauriPlatform,
          admin: { width: '33%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'releasedAt',
          type: 'date',
          required: true,
          admin: { width: '50%', date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'minOs',
          label: 'Minimum OS',
          type: 'text',
          admin: { width: '50%', description: 'e.g. Windows 10 (1809)' },
        },
      ],
    },
    {
      name: 'installer',
      type: 'upload',
      relationTo: 'installers',
      required: true,
      // Same product and version only: this file is what the update feed ships.
      filterOptions: ({ data }) => {
        const product = data?.product as ID | null | undefined
        if (product == null) return false
        const where: Where = { product: { equals: extractID(product) } }
        if (data?.version) where.version = { equals: data.version }
        return where
      },
      admin: {
        description:
          'Upload it in Products → Installers first (built with createUpdaterArtifacts).',
      },
    },
    {
      name: 'updaterSignature',
      type: 'textarea',
      required: true,
      admin: { description: "Paste the full contents of the installer's .sig file." },
    },
    {
      name: 'notes',
      type: 'textarea',
      localized: true,
      admin: { description: 'Plain text. Shown on the download page and in the update feed.' },
    },
    {
      name: 'sha256',
      label: 'SHA-256',
      type: 'text',
      access: { create: computed, update: computed },
      admin: { position: 'sidebar', readOnly: true, description: 'Copied from the installer.' },
    },
    {
      name: 'sizeBytes',
      label: 'Size (bytes)',
      type: 'number',
      access: { create: computed, update: computed },
      admin: { position: 'sidebar', readOnly: true, description: 'Copied from the installer.' },
    },
  ],
}
