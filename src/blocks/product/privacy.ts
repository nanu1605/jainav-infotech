import type { Block } from 'payload'

export const Privacy: Block = {
  slug: 'privacy',
  interfaceName: 'ProductPrivacyBlock',
  labels: { singular: 'Privacy panel', plural: 'Privacy panels' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'local',
      label: 'Stays on your device',
      type: 'array',
      fields: [{ name: 'text', type: 'text', localized: true, required: true }],
    },
    {
      name: 'cloud',
      label: 'Goes to the cloud',
      type: 'array',
      fields: [{ name: 'text', type: 'text', localized: true, required: true }],
    },
    { name: 'note', type: 'textarea', localized: true },
  ],
}
