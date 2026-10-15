import type { Block } from 'payload'

import { integer } from '@/fields/validators'

export const Latest: Block = {
  slug: 'latest',
  interfaceName: 'PageLatestBlock',
  labels: { singular: 'Latest posts & changelog', plural: 'Latest posts & changelog' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      type: 'row',
      fields: [
        {
          name: 'postsCount',
          type: 'number',
          required: true,
          defaultValue: 2,
          min: 1,
          max: 12,
          validate: integer,
          admin: { step: 1, width: '50%' },
        },
        {
          name: 'changelogCount',
          type: 'number',
          required: true,
          defaultValue: 3,
          min: 1,
          max: 12,
          validate: integer,
          admin: { step: 1, width: '50%' },
        },
      ],
    },
  ],
}
