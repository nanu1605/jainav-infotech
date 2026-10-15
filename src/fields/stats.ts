import type { ArrayField } from 'payload'

/**
 * Stat figures for the home Proof block and the product StatStrip block (spec §8.2). `downloads`
 * shows the real download total, so only `manual` stats need a figure. Payload skips validation
 * (admin and server) while a field's condition is false, so `required` applies to manual stats only.
 */
export const statsField: ArrayField = {
  name: 'stats',
  type: 'array',
  interfaceName: 'Stats',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'source',
          type: 'select',
          required: true,
          defaultValue: 'manual',
          options: [
            { label: 'Manual', value: 'manual' },
            { label: 'Download total', value: 'downloads' },
          ],
          admin: { width: '30%' },
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: {
            width: '30%',
            placeholder: '10,000+',
            condition: (_, siblingData) => siblingData?.source !== 'downloads',
          },
        },
        { name: 'label', type: 'text', localized: true, required: true, admin: { width: '40%' } },
      ],
    },
  ],
}
