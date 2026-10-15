import { slugField, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrStaff, staff } from '@/access/roles'
import { hiStatusField } from '@/fields/hiStatus'
import { revalidateCollection } from '@/hooks/revalidate'
import { publicPath } from '@/lib/routes'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'hiStatus', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
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
      tag: 'posts',
      paths: ({ slug }) => ['/blog', ...(slug ? [publicPath.posts(slug)] : [])],
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
            { name: 'excerpt', type: 'textarea', localized: true },
            { name: 'cover', type: 'upload', relationTo: 'media' },
            { name: 'body', type: 'richText', localized: true, required: true },
          ],
        },
        {
          label: 'Details',
          fields: [
            { name: 'tags', type: 'text', hasMany: true },
            { name: 'author', type: 'relationship', relationTo: 'team' },
          ],
        },
      ],
    },
    slugField({ useAsSlug: 'title' }),
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set automatically on first publish if left empty.',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) =>
            siblingData._status === 'published' && !value ? new Date().toISOString() : value,
        ],
      },
    },
    hiStatusField,
  ],
}
