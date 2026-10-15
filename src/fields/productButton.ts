import type { Condition, GroupField, SelectFieldSingleValidation } from 'payload'
import { select } from 'payload/shared'

import { httpUrl } from './validators'

export type ProductButtonType = 'visit' | 'download' | 'buy' | 'demo' | 'contact'

export type ProductButtonInput = { type?: ProductButtonType | null; plan?: unknown }
export type ProductButtonContext = {
  hostingMode?: 'external' | 'hosted' | null
  externalUrl?: string | null
}

/**
 * Spec §8.5 rules that need only the product document. That the plan belongs to this product
 * is enforced by the plan field's `filterOptions`, which Payload re-checks on submit.
 */
export function validateProductButton(
  button: ProductButtonInput | null | undefined,
  product: ProductButtonContext,
): true | string {
  switch (button?.type) {
    case 'visit':
      return product.externalUrl ? true : 'Visit needs the external URL (Basics tab).'
    case 'buy':
      if (product.hostingMode !== 'hosted') return 'Buy is only available for hosted products.'
      return button.plan != null ? true : 'Choose the plan this button sells.'
    default:
      return true
  }
}

const shownFor =
  (type: ProductButtonType): Condition =>
  (_, siblingData) =>
    siblingData?.type === type

/** Primary / secondary product button (spec §8.5). Its rules run on publish (drafts skip validation). */
export const productButtonField = ({
  name,
  label,
  required = false,
}: {
  name: string
  label: string
  required?: boolean
}): GroupField => {
  const validateType: SelectFieldSingleValidation = async (value, options) => {
    const base = await select(value, options)
    if (base !== true) return base
    return validateProductButton(
      { ...(options.siblingData as ProductButtonInput), type: value as ProductButtonType },
      options.data as ProductButtonContext,
    )
  }

  return {
    name,
    label,
    type: 'group',
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'select',
            required,
            options: [
              { label: 'Visit website', value: 'visit' },
              { label: 'Download', value: 'download' },
              { label: 'Buy', value: 'buy' },
              { label: 'Book a demo', value: 'demo' },
              { label: 'Contact', value: 'contact' },
            ],
            validate: validateType,
            admin: { width: '50%' },
          },
          {
            name: 'labelOverride',
            type: 'text',
            localized: true,
            admin: { width: '50%', description: 'Leave empty for the default label.' },
          },
        ],
      },
      {
        name: 'plan',
        type: 'relationship',
        relationTo: 'plans',
        // Only this product's plans; nothing is selectable before the product's first save.
        filterOptions: ({ id }) => (id ? { product: { equals: id } } : false),
        admin: { condition: shownFor('buy') },
      },
      {
        name: 'channel',
        type: 'select',
        defaultValue: 'stable',
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' },
        ],
        admin: { condition: shownFor('download') },
      },
      {
        name: 'url',
        type: 'text',
        validate: httpUrl,
        admin: {
          condition: shownFor('demo'),
          description: 'Optional. Overrides the scheduler link in Site settings.',
        },
      },
    ],
  }
}
