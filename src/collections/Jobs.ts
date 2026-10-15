import { slugField, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrStaff, staff } from '@/access/roles'
import { hiStatusField } from '@/fields/hiStatus'
import { revalidateCollection } from '@/hooks/revalidate'
import { publicPath } from '@/lib/routes'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'workMode', 'hiStatus', '_status', 'updatedAt'],
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
      tag: 'jobs',
      paths: ({ slug }) => ['/careers', ...(slug ? [publicPath.jobs(slug)] : [])],
    }),
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Full-time', value: 'full-time' },
            { label: 'Part-time', value: 'part-time' },
            { label: 'Internship', value: 'internship' },
            { label: 'Contract', value: 'contract' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'workMode',
          type: 'select',
          required: true,
          options: [
            { label: 'On-site', value: 'onsite' },
            { label: 'Remote', value: 'remote' },
            { label: 'Hybrid', value: 'hybrid' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'location', type: 'text', localized: true },
    { name: 'description', type: 'richText', localized: true },
    slugField({ useAsSlug: 'title' }),
    { name: 'postedAt', type: 'date', admin: { position: 'sidebar' } },
    hiStatusField,
  ],
}
