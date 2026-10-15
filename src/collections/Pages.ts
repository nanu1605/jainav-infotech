import { slugField, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrStaff, staff } from '@/access/roles'
import { pageBlocks } from '@/blocks/page'
import { hiStatusField } from '@/fields/hiStatus'
import { revalidateCollection } from '@/hooks/revalidate'
import { publicPath } from '@/lib/routes'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'hiStatus', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description: 'Block-built pages. The page with the slug "home" is the home page.',
  },
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
      tag: 'pages',
      paths: ({ slug }) => (slug ? [publicPath.pages(slug)] : []),
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
            { name: 'layout', type: 'blocks', blocks: pageBlocks },
          ],
        },
      ],
    },
    slugField({ useAsSlug: 'title' }),
    hiStatusField,
  ],
}
