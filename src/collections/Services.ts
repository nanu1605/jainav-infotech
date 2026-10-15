import { slugField, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrStaff, staff } from '@/access/roles'
import { pageBlocks } from '@/blocks/page'
import { hiStatusField } from '@/fields/hiStatus'
import { integer } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'
import { publicPath } from '@/lib/routes'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sortOrder', 'hiStatus', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
  },
  defaultSort: 'sortOrder',
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({
      tag: 'services',
      paths: ({ slug }) => ['/services', ...(slug ? [publicPath.services(slug)] : [])],
    }),
  },
  fields: [
    // The SEO plugin appends its tab here, so tabs must stay the first field.
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'title', type: 'text', localized: true, required: true },
            { name: 'summary', type: 'textarea', localized: true, required: true },
            {
              name: 'icon',
              type: 'text',
              admin: {
                description: 'Lucide icon name in kebab-case, e.g. cloud-cog (lucide.dev/icons).',
              },
            },
            {
              name: 'capabilities',
              type: 'array',
              fields: [{ name: 'text', type: 'text', localized: true, required: true }],
            },
            {
              name: 'deliverables',
              type: 'array',
              fields: [{ name: 'text', type: 'text', localized: true, required: true }],
            },
            {
              name: 'relatedProducts',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
            },
          ],
        },
        {
          label: 'Layout',
          fields: [{ name: 'layout', type: 'blocks', blocks: pageBlocks }],
        },
      ],
    },
    slugField({ useAsSlug: 'title' }),
    {
      name: 'sortOrder',
      type: 'number',
      validate: integer,
      admin: { position: 'sidebar', step: 1 },
    },
    hiStatusField,
  ],
}
