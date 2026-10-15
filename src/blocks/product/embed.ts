import type { Block } from 'payload'

import { EMBED_ALLOWED_HOSTS, embedUrl } from '@/lib/embed'

export const Embed: Block = {
  slug: 'embed',
  interfaceName: 'ProductEmbedBlock',
  labels: { singular: 'Embed', plural: 'Embeds' },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      admin: { description: 'Describes the embed for screen readers (iframe title).' },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      validate: embedUrl,
      admin: { description: `Allowed: ${EMBED_ALLOWED_HOSTS.join(', ')}` },
    },
    {
      name: 'aspectRatio',
      type: 'select',
      required: true,
      defaultValue: '16:9',
      options: ['16:9', '4:3', '1:1'],
    },
  ],
}
