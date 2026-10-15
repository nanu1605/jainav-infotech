import type { Block, TextFieldSingleValidation } from 'payload'
import { text as validateText } from 'payload/shared'

// Year or year-month, so the frontend can format it per locale with Intl.
const yearOrMonth: TextFieldSingleValidation = (value, options) =>
  value && !/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(value)
    ? 'Use YYYY or YYYY-MM, e.g. 2024 or 2024-06'
    : validateText(value, options)

export const Timeline: Block = {
  slug: 'timeline',
  interfaceName: 'PageTimelineBlock',
  labels: { singular: 'Timeline', plural: 'Timelines' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'date',
              type: 'text',
              validate: yearOrMonth,
              admin: { width: '30%', placeholder: '2024-06' },
            },
            {
              name: 'title',
              type: 'text',
              localized: true,
              required: true,
              admin: { width: '70%' },
            },
          ],
        },
        { name: 'text', type: 'textarea', localized: true },
      ],
    },
  ],
}
