import type { CollectionConfig, TextFieldSingleValidation } from 'payload'
import { text as validateText } from 'payload/shared'

import { contentEditors, staff } from '@/access/roles'
import { httpUrl } from '@/fields/validators'

const linkSlug: TextFieldSingleValidation = (value, options) =>
  value && !/^[a-z0-9-]+$/.test(value)
    ? 'Use lowercase letters, numbers and hyphens'
    : validateText(value, options)

/** Tracked redirects served by /go/[slug] (spec §8.6). */
export const ShortLinks: CollectionConfig = {
  slug: 'short-links',
  admin: {
    group: 'Settings',
    useAsTitle: 'slug',
    defaultColumns: ['slug', 'destination', 'active', 'updatedAt'],
    listSearchableFields: ['slug', 'destination'],
  },
  access: {
    read: staff,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, validate: linkSlug },
    { name: 'destination', type: 'text', required: true, validate: httpUrl },
    {
      name: 'utm',
      label: 'UTM defaults',
      type: 'group',
      admin: { description: 'Added to the destination unless it already sets that parameter.' },
      fields: [
        { name: 'source', type: 'text', defaultValue: 'jainav' },
        { name: 'medium', type: 'text', defaultValue: 'site' },
        { name: 'campaign', type: 'text', admin: { description: 'Leave empty to use the slug.' } },
      ],
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'notes', type: 'textarea' },
  ],
}
