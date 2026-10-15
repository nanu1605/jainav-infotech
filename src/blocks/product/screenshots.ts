import type { Block } from 'payload'

export const Screenshots: Block = {
  slug: 'screenshots',
  interfaceName: 'ProductScreenshotsBlock',
  labels: { singular: 'Screenshot gallery', plural: 'Screenshot galleries' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          filterOptions: { mimeType: { contains: 'image/' } },
        },
        { name: 'caption', type: 'text', localized: true },
      ],
    },
  ],
}
