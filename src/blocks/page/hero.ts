import type { Block } from 'payload'

import { linkField } from '@/fields/link'
import { href } from '@/fields/validators'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'PageHeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'headline', type: 'text', localized: true, required: true },
    { name: 'subheadline', type: 'textarea', localized: true },
    linkField({ name: 'primary', label: 'Primary button' }),
    linkField({ name: 'secondary', label: 'Secondary button' }),
    {
      name: 'chips',
      type: 'array',
      admin: { description: 'Routing chips, e.g. "My restaurant" → /products/menumesh.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              localized: true,
              required: true,
              admin: { width: '50%' },
            },
            { name: 'href', type: 'text', required: true, validate: href, admin: { width: '50%' } },
          ],
        },
      ],
    },
  ],
}
