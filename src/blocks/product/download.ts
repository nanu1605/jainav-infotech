import type { Block } from 'payload'

export const Download: Block = {
  slug: 'download',
  interfaceName: 'ProductDownloadBlock',
  labels: { singular: 'Download panel', plural: 'Download panels' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'channel',
      type: 'select',
      required: true,
      defaultValue: 'stable',
      options: [
        { label: 'Stable', value: 'stable' },
        { label: 'Beta', value: 'beta' },
      ],
      admin: {
        description: 'Shows the latest published release on this channel (version, size, SHA-256).',
      },
    },
    { name: 'note', type: 'textarea', localized: true },
  ],
}
