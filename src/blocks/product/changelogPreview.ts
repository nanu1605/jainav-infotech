import type { Block } from 'payload'

import { integer } from '@/fields/validators'

export const ChangelogPreview: Block = {
  slug: 'changelogPreview',
  interfaceName: 'ProductChangelogPreviewBlock',
  labels: { singular: 'Changelog preview', plural: 'Changelog previews' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'limit',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 1,
      max: 12,
      validate: integer,
      admin: { step: 1, description: "This product's newest changelog entries and releases." },
    },
  ],
}
