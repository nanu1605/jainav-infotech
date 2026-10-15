import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const Cta: Block = {
  slug: 'cta',
  interfaceName: 'PageCtaBlock',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  fields: [
    { name: 'heading', type: 'text', localized: true, required: true },
    { name: 'text', type: 'textarea', localized: true },
    linkField({ name: 'primary', label: 'Primary button' }),
    linkField({ name: 'secondary', label: 'Secondary button' }),
    { name: 'showNewsletter', type: 'checkbox', label: 'Show newsletter sign-up' },
  ],
}
