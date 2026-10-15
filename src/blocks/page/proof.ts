import type { Block } from 'payload'

import { statsField } from '@/fields/stats'

export const Proof: Block = {
  slug: 'proof',
  interfaceName: 'PageProofBlock',
  labels: { singular: 'Proof (stats & testimonials)', plural: 'Proof blocks' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    statsField,
    {
      name: 'testimonials',
      type: 'relationship',
      relationTo: 'testimonials',
      hasMany: true,
      admin: {
        description:
          'Only published (consented) testimonials show. The block hides itself when empty.',
      },
    },
  ],
}
