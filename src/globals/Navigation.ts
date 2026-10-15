import type { GlobalConfig } from 'payload'

import { anyone, contentEditors } from '@/access/roles'
import { linkField } from '@/fields/link'
import { revalidateGlobal } from '@/hooks/revalidate'

// linkField's label (localized) + href row without its wrapping group. A fresh copy per use:
// Payload sanitizes field configs in place, so they must not be shared between two arrays.
const linkFields = () => linkField({ required: true }).fields

/** Header and footer menus (spec §8.1, §9.2). */
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  admin: { group: 'Settings' },
  access: { read: anyone, update: contentEditors },
  hooks: { afterChange: [revalidateGlobal('navigation')] },
  fields: [
    {
      name: 'header',
      type: 'array',
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        ...linkFields(),
        {
          name: 'megaMenu',
          type: 'select',
          options: ['none', 'products'],
          defaultValue: 'none',
        },
      ],
    },
    {
      name: 'footer',
      type: 'array',
      labels: { singular: 'Column', plural: 'Columns' },
      fields: [
        { name: 'title', type: 'text', localized: true, required: true },
        {
          name: 'links',
          type: 'array',
          labels: { singular: 'Link', plural: 'Links' },
          fields: linkFields(),
        },
      ],
    },
  ],
}
