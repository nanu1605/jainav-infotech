import type { GlobalConfig, NumberFieldSingleValidation } from 'payload'

import { ownerOnly } from '@/access/roles'
import { integer } from '@/fields/validators'

/** A typo here deletes for good at the next run: 2 for 24 would take every older lead. */
const atLeast =
  (min: number): NumberFieldSingleValidation =>
  (value, options) =>
    value != null && value < min ? `Must be at least ${min}` : integer(value, options)

/**
 * How long personal data stays (spec §16). The daily cleanup job applies these
 * (src/lib/retention.ts); analytics has its own setting on the server (docs/runbooks/retention.md).
 */
export const RetentionSettings: GlobalConfig = {
  slug: 'retention-settings',
  admin: {
    group: 'Settings',
    description:
      'A daily job applies these. Deleted records can’t be brought back, and the Privacy Policy states these periods: change it with them.',
  },
  access: { read: ownerOnly, update: ownerOnly },
  fields: [
    {
      name: 'leadMonths',
      label: 'Delete leads and their CVs after (months)',
      type: 'number',
      required: true,
      defaultValue: 24,
      validate: atLeast(6),
      admin: { step: 1, description: 'Counted from each lead’s Last contact.' },
    },
    {
      name: 'dataRequestMonths',
      label: 'Delete closed privacy requests after (months)',
      type: 'number',
      validate: atLeast(6),
      admin: { step: 1, description: 'Counted from when each was closed. Empty: they stay.' },
    },
    {
      name: 'removeOrders',
      label: 'Remove orders and invoices after the legal period',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Leave this off until the CA confirms the period in writing.' },
    },
    {
      name: 'orderFinancialYears',
      label: 'Legal period (financial years)',
      type: 'number',
      required: true,
      defaultValue: 8,
      validate: atLeast(6),
      admin: {
        step: 1,
        description:
          'Counted after the financial year of an order’s last invoice or credit note. Its license stays.',
      },
    },
  ],
}
