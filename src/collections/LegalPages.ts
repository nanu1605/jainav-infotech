import { slugField, type CollectionConfig } from 'payload'

import { draftsUnlessOwner, ownerPublishesOnly } from '@/access/publishGate'
import { ownerOnly, publishedOrStaff, staff } from '@/access/roles'
import { hiStatusField } from '@/fields/hiStatus'
import { revalidateCollection } from '@/hooks/revalidate'
import { publicPath } from '@/lib/routes'

export const LegalPages: CollectionConfig = {
  slug: 'legal-pages',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'effectiveDate', 'hiStatus', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description:
      'Editors save drafts; only the Owner can publish, and publishing counts as approval. Version history is kept.',
  },
  // Keep every version: published texts are what visitors and buyers agreed to (spec §8.13).
  versions: { drafts: true, maxPerDoc: 0 },
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: draftsUnlessOwner,
    update: draftsUnlessOwner,
    delete: ownerOnly,
  },
  hooks: {
    beforeOperation: [ownerPublishesOnly],
    ...revalidateCollection({
      tag: 'legal-pages',
      paths: ({ slug }) => (slug ? [publicPath['legal-pages'](slug)] : []),
    }),
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'body', type: 'richText', localized: true },
    slugField({ useAsSlug: 'title' }),
    {
      name: 'version',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Shown on the page, e.g. 1.0. Bump it on every change.',
      },
    },
    {
      name: 'effectiveDate',
      type: 'date',
      required: true, // enforced on publish; draft saves skip validation
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    hiStatusField,
  ],
}
