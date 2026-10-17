import {
  APIError,
  type GlobalBeforeChangeHook,
  type GlobalConfig,
  type NumberFieldSingleValidation,
} from 'payload'

import { ownerOnly, storeStaff } from '@/access/roles'
import { integer } from '@/fields/validators'
import { revalidateGlobal } from '@/hooks/revalidate'
import { GST_STATES } from '@/lib/tax/states'

const prefix = (value: string | null | undefined) =>
  !value || /^[A-Z0-9]{1,4}$/.test(value) ? true : '1–4 capital letters or digits'

const positive: NumberFieldSingleValidation = (value, options) =>
  value != null && value < 1 ? 'Must be at least 1' : integer(value, options)

/** Invoices with GST must name the seller's GSTIN (spec §11.4). */
const gstNeedsGstin: GlobalBeforeChangeHook = async ({ data, req }) => {
  if (!data.gstEnabled) return data
  const { company } = await req.payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (!company?.gstin) {
    throw new APIError('Add the company GSTIN in Site settings before turning GST on.', 400)
  }
  return data
}

/**
 * Store, tax and licensing settings (spec §9.2). Every tax value must be confirmed with the CA
 * before going live (spec §11.4); until then GST stays off and the SAC code is a placeholder.
 */
export const CommerceSettings: GlobalConfig = {
  slug: 'commerce-settings',
  admin: {
    group: 'Settings',
    description: 'Confirm every tax setting with the CA before going live.',
  },
  access: { read: storeStaff, update: ownerOnly },
  hooks: { beforeChange: [gstNeedsGstin], afterChange: [revalidateGlobal('commerce-settings')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Tax',
          fields: [
            {
              name: 'gstEnabled',
              label: 'Charge GST',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Off: invoices carry no tax lines and no "incl. GST" anywhere.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'gstRatePercent',
                  label: 'GST rate (%)',
                  type: 'number',
                  required: true,
                  defaultValue: 18,
                  min: 0,
                  max: 28,
                  admin: { width: '33%' },
                },
                {
                  name: 'sacCode',
                  label: 'SAC code',
                  type: 'text',
                  validate: (value: string | null | undefined) =>
                    !value || /^\d{4,8}$/.test(value) ? true : '4–8 digits',
                  admin: { width: '33%', description: 'From the CA: {{SAC_CODE}}.' },
                },
                {
                  name: 'homeStateCode',
                  label: 'Home state',
                  type: 'select',
                  required: true,
                  defaultValue: '23',
                  options: Object.entries(GST_STATES).map(([value, label]) => ({
                    label: `${label} (${value})`,
                    value,
                  })),
                  admin: { width: '34%', description: 'Buyers here pay CGST + SGST; others IGST.' },
                },
              ],
            },
            {
              name: 'pricesIncludeGst',
              label: 'Plan prices include GST',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'internationalEnabled',
                  label: 'International sales',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: {
                    width: '50%',
                    readOnly: true,
                    description: 'India only for now (spec §22); USD pricing comes later.',
                  },
                },
                {
                  name: 'exportTreatment',
                  type: 'select',
                  options: [
                    { label: 'Zero-rated under LUT', value: 'lut' },
                    { label: 'IGST paid', value: 'igst' },
                  ],
                  admin: { width: '50%', description: 'From the CA: {{CONFIRM_WITH_CA}}.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Invoices',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'invoicePrefix',
                  type: 'text',
                  required: true,
                  defaultValue: 'JI',
                  validate: prefix,
                  admin: { width: '50%', description: 'e.g. JI → JI/26-27/00001' },
                },
                {
                  name: 'creditNotePrefix',
                  type: 'text',
                  required: true,
                  defaultValue: 'JC',
                  // Each prefix is its own numbering series (invoice-counters).
                  validate: (
                    value: string | null | undefined,
                    { siblingData }: { siblingData: Partial<{ invoicePrefix: string }> },
                  ) =>
                    value && value === siblingData.invoicePrefix
                      ? 'Must differ from the invoice prefix'
                      : prefix(value),
                  admin: { width: '50%', description: 'e.g. JC → JC/26-27/00001' },
                },
              ],
            },
          ],
        },
        {
          label: 'Policies',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'currentTermsVersion',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'Recorded with each order. Checkout needs it.',
                  },
                },
                {
                  name: 'currentEulaVersion',
                  label: 'Current EULA version',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'Recorded with each order. Checkout needs it.',
                  },
                },
              ],
            },
            {
              name: 'refundWindowDays',
              type: 'number',
              validate: positive,
              admin: { description: 'From the refunds policy: {{REFUND_WINDOW_DAYS}}.' },
            },
          ],
        },
        {
          label: 'Licensing',
          description: 'Used from Phase 8 (spec §12, §22).',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'defaultMaxActivations',
                  type: 'number',
                  required: true,
                  defaultValue: 2,
                  validate: positive,
                },
                {
                  name: 'deactivationsPerMonth',
                  type: 'number',
                  required: true,
                  defaultValue: 3,
                  validate: positive,
                },
                {
                  name: 'trialDays',
                  type: 'number',
                  required: true,
                  defaultValue: 14,
                  validate: positive,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'licenseTokenDays',
                  type: 'number',
                  required: true,
                  defaultValue: 30,
                  validate: positive,
                },
                {
                  name: 'refreshAfterDays',
                  type: 'number',
                  required: true,
                  defaultValue: 7,
                  validate: positive,
                },
                {
                  name: 'tokenGraceDays',
                  type: 'number',
                  required: true,
                  defaultValue: 180,
                  validate: positive,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
