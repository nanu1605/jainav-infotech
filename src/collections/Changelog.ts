import type { CollectionConfig } from 'payload'

import { anyone, contentEditors } from '@/access/roles'
import { revalidateCollection } from '@/hooks/revalidate'

/** Manual changelog entries; the public changelog merges them with published releases (spec §8.12). */
export const Changelog: CollectionConfig = {
  slug: 'changelog',
  labels: { singular: 'Changelog entry', plural: 'Changelog' },
  admin: {
    group: 'Products',
    useAsTitle: 'title',
    defaultColumns: ['title', 'product', 'type', 'date'],
    listSearchableFields: ['title'],
  },
  defaultSort: '-date',
  access: {
    read: anyone,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({ tag: 'changelog' }),
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Improved', value: 'improved' },
        { label: 'Fixed', value: 'fixed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
  ],
}
