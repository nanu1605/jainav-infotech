import type { GroupField } from 'payload'

import { href } from './validators'

/** A labelled link used in blocks and navigation. The label is localized; the target is shared. */
export const linkField = ({
  name = 'link',
  label,
  required = false,
}: {
  name?: string
  label?: string
  required?: boolean
} = {}): GroupField => ({
  name,
  label,
  type: 'group',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'label', type: 'text', localized: true, required, admin: { width: '50%' } },
        { name: 'href', type: 'text', required, validate: href, admin: { width: '50%' } },
      ],
    },
  ],
})
