import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'

import { hasRole, nobody, ownerOnly, ownerOnlyField, storeStaff } from '@/access/roles'

export const LICENSE_STATUSES = ['active', 'suspended', 'revoked', 'expired'] as const
export type LicenseStatus = (typeof LICENSE_STATUSES)[number]

const readOnly = { readOnly: true } as const
/** Written only by server code: staff can't set or change it through the admin or REST. */
const fixed = { create: () => false, update: () => false }

/**
 * A new license gets its key here (spec §12.2), whoever creates it: fulfilment, or the Owner
 * issuing a complimentary one in the admin. Defaults come from the plan, then Commerce settings.
 * Support may suspend and reinstate; revoking (and undoing a revocation) is the Owner's.
 */
const prepareLicense: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'update') {
    const changed = data.status !== undefined && data.status !== originalDoc?.status
    const supportOnly = ['active', 'suspended']
    if (
      changed &&
      req.user &&
      !hasRole(req.user, 'owner') &&
      !(supportOnly.includes(data.status) && supportOnly.includes(originalDoc?.status))
    ) {
      throw new APIError('Only the Owner can revoke a license or reinstate a revoked one.', 403)
    }
    return data
  }
  if (req.user && data.source === 'purchase') {
    throw new APIError('Purchase licenses come from paid orders.', 400)
  }
  const { prepareNewLicense } = await import('@/lib/licensing/license')
  return prepareNewLicense(req, data)
}

/** Complimentary and manual licenses email their key (purchases carry it in the order email). */
const emailNewKey: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation === 'create' && doc.source !== 'purchase') {
    await req.payload.jobs.queue({ task: 'sendLicenseEmail', input: { id: doc.id }, req })
  }
  return doc
}

/**
 * Suspending, revoking or reinstating a license emails its customer (spec §11.7), whoever does it.
 * Sent after the response, when the change has committed; the reconcile job's sweep sends what
 * this can't, and neither sends when there is nothing to tell. Code that tells the customer itself
 * (refunds, disputes) sets `context.skipStatusEmail`.
 */
const emailStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (
    operation === 'update' &&
    doc.status !== previousDoc?.status &&
    !req.context.skipStatusEmail
  ) {
    const { statusEmailSoon } = await import('@/lib/licensing/deliver')
    statusEmailSoon(doc.id)
  }
  return doc
}

/**
 * Licenses (spec §9.1, §12). Customer data: Owner + Support only. The Owner issues complimentary
 * licenses with "Create new" (spec §10: the admin's own form is the endpoint, so it has admin
 * authentication); the key is generated on save and emailed to the customer.
 */
export const Licenses: CollectionConfig = {
  slug: 'licenses',
  labels: { singular: 'License', plural: 'Licenses' },
  admin: {
    group: 'Store',
    useAsTitle: 'keyLast4',
    defaultColumns: ['keyLast4', 'product', 'plan', 'customer', 'status', 'issuedAt'],
    listSearchableFields: ['keyLast4'],
    description:
      'Create new issues a complimentary license: the key is generated on save and emailed to the customer.',
    components: {
      edit: { beforeDocumentControls: ['@/components/admin/LicenseActions#LicenseActions'] },
    },
  },
  defaultSort: '-issuedAt',
  // A copy would carry the source's email state and update period: licenses come from Create new.
  disableDuplicate: true,
  access: { read: storeStaff, create: ownerOnly, update: storeStaff, delete: nobody },
  hooks: { beforeChange: [prepareLicense], afterChange: [emailNewKey, emailStatusChange] },
  endpoints: [
    {
      path: '/:id/resend-email',
      method: 'post',
      // Imported on use: server-only code can't load in the Payload CLI, which reads this config.
      handler: async (req) =>
        (await import('@/lib/licensing/deliver')).resendLicenseEmailEndpoint(req),
    },
  ],
  fields: [
    {
      name: 'licenseKey',
      type: 'text',
      virtual: true,
      admin: {
        ...readOnly,
        description: 'Shown to the customer on their Licenses page.',
        condition: (data) => Boolean(data?.keyEncrypted),
      },
      hooks: {
        afterRead: [
          async ({ siblingData }) => {
            if (!siblingData?.keyEncrypted) return undefined
            const { decryptLicenseKey, licensingConfig } = await import('@/lib/licensing/keys')
            const cfg = licensingConfig()
            return cfg ? decryptLicenseKey(siblingData.keyEncrypted, cfg) : undefined
          },
        ],
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          index: true,
          access: { update: ownerOnlyField },
          admin: { width: '50%' },
        },
        {
          name: 'plan',
          type: 'relationship',
          relationTo: 'plans',
          required: true,
          access: { update: ownerOnlyField },
          filterOptions: ({ data }) =>
            data?.product ? { product: { equals: data.product } } : true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'customer',
          type: 'relationship',
          relationTo: 'customers',
          required: true,
          index: true,
          access: { update: ownerOnlyField },
          admin: {
            width: '50%',
            description: 'For someone new, create the customer first (Store → Customers).',
          },
        },
        {
          name: 'order',
          type: 'relationship',
          relationTo: 'orders',
          unique: true,
          access: fixed,
          admin: { ...readOnly, width: '50%', condition: (data) => Boolean(data?.order) },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [...LICENSE_STATUSES],
          index: true,
          admin: {
            width: '50%',
            description: 'Suspended and revoked licenses drop the app to the free tier.',
          },
        },
        {
          name: 'source',
          type: 'select',
          required: true,
          defaultValue: 'complimentary',
          options: ['purchase', 'complimentary', 'manual'],
          access: { update: () => false },
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'maxActivations',
          type: 'number',
          min: 1,
          admin: {
            width: '50%',
            step: 1,
            description: 'Devices at once. Empty on create: the plan’s number.',
          },
        },
        {
          name: 'updatesUntil',
          type: 'date',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
            description:
              'Builds released after this run as the free tier. Empty on create: the plan’s update period; clear it later for lifetime updates.',
          },
        },
      ],
    },
    {
      name: 'issuedAt',
      type: 'date',
      access: fixed,
      admin: { ...readOnly, position: 'sidebar' },
    },
    {
      name: 'keyLast4',
      label: 'Key ends with',
      type: 'text',
      access: fixed,
      admin: { ...readOnly, position: 'sidebar' },
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Internal only.' } },
    {
      name: 'activations',
      label: 'Devices (activation history)',
      type: 'join',
      collection: 'activations',
      on: 'license',
      defaultSort: '-lastSeenAt',
      admin: {
        defaultColumns: ['deviceName', 'active', 'firstSeenAt', 'lastSeenAt', 'deactivatedBy'],
        allowCreate: false,
      },
    },
    {
      name: 'keyHash',
      type: 'text',
      unique: true,
      index: true,
      access: fixed,
      admin: { hidden: true },
    },
    { name: 'keyEncrypted', type: 'text', access: fixed, admin: { hidden: true } },
    // The license email job's claim and sent time, so parallel runs send it once.
    { name: 'emailClaimedAt', type: 'date', access: fixed, admin: { hidden: true } },
    { name: 'emailedAt', type: 'date', access: fixed, admin: { hidden: true } },
    // The status emails: the status last told to the customer (none for active), and the claim.
    {
      name: 'statusNotifiedAs',
      type: 'select',
      options: ['suspended', 'revoked'],
      access: fixed,
      admin: { hidden: true },
    },
    { name: 'statusClaimedAt', type: 'date', access: fixed, admin: { hidden: true } },
  ],
}

/**
 * Support deactivates a device by unticking Active; the app can then use the slot elsewhere. When
 * and by whom are set here, never taken from the request (the licensing API writes them in SQL).
 */
const deactivateFromAdmin: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) return data
  // Payload read the row before this hook: lock it and decide from what is stored now, so a
  // deactivation from the app or the account page that committed meanwhile stands. Only Active
  // comes from staff; leaving everything else out of the write keeps the licensing API's newer
  // values (last seen, when and by whom) instead of Payload's earlier copy.
  const adapter = req.payload.db as unknown as PostgresAdapter
  const tx = adapter.sessions[String(await req.transactionID)]?.db ?? adapter.drizzle
  const { rows } = await tx.execute(sql`
    SELECT active, license_id AS license, device_name AS "deviceName",
           device_id_hash AS "deviceIdHash"
    FROM activations WHERE id = ${originalDoc.id} FOR UPDATE
  `)
  const row = rows[0] as
    { active: boolean; license: number; deviceName: string; deviceIdHash: string } | undefined
  const stored = row?.active ?? originalDoc.active
  const { active } = data
  for (const key of Object.keys(data)) delete data[key]
  // Required fields must be present to validate: the stored values, not Payload's copy.
  if (row)
    Object.assign(data, {
      license: row.license,
      deviceName: row.deviceName,
      deviceIdHash: row.deviceIdHash,
    })
  if (!stored) {
    if (active) throw new APIError('A deactivated device activates again from the app.', 400)
    return data
  }
  if (active === false) {
    data.active = false
    data.deactivatedAt = new Date().toISOString()
    data.deactivatedBy = 'support'
  }
  return data
}

/** Devices a license is or was active on (spec §9.1, §12.4). Written by the licensing API. */
export const Activations: CollectionConfig = {
  slug: 'activations',
  admin: {
    group: 'Store',
    useAsTitle: 'deviceName',
    defaultColumns: ['deviceName', 'license', 'active', 'lastSeenAt', 'deactivatedAt'],
    description: 'Untick Active to free a device slot. It doesn’t count toward the monthly limit.',
  },
  defaultSort: '-lastSeenAt',
  access: { read: storeStaff, create: nobody, update: storeStaff, delete: nobody },
  hooks: { beforeChange: [deactivateFromAdmin] },
  fields: [
    {
      name: 'license',
      type: 'relationship',
      relationTo: 'licenses',
      required: true,
      index: true,
      access: fixed,
      admin: readOnly,
    },
    { name: 'active', type: 'checkbox', defaultValue: true, index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'deviceName',
          type: 'text',
          required: true,
          access: fixed,
          admin: { ...readOnly, width: '33%' },
        },
        {
          name: 'os',
          label: 'OS',
          type: 'text',
          access: fixed,
          admin: { ...readOnly, width: '33%' },
        },
        { name: 'appVersion', type: 'text', access: fixed, admin: { ...readOnly, width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'firstSeenAt', type: 'date', access: fixed, admin: { ...readOnly, width: '50%' } },
        { name: 'lastSeenAt', type: 'date', access: fixed, admin: { ...readOnly, width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'deactivatedAt', type: 'date', admin: { ...readOnly, width: '50%' } },
        {
          name: 'deactivatedBy',
          type: 'select',
          options: [
            { label: 'The app', value: 'device' },
            { label: 'The customer’s account page', value: 'account' },
            { label: 'Support', value: 'support' },
          ],
          admin: { ...readOnly, width: '50%' },
        },
      ],
    },
    {
      name: 'deviceIdHash',
      type: 'text',
      required: true,
      index: true,
      access: fixed,
      admin: { hidden: true },
    },
    // The new-device email job's claim and sent time.
    { name: 'notifyClaimedAt', type: 'date', access: fixed, admin: { hidden: true } },
    { name: 'notifiedAt', type: 'date', access: fixed, admin: { hidden: true } },
  ],
}

/** One trial per device and product (spec §12.4, §22): started by `POST /trial`. */
export const Trials: CollectionConfig = {
  slug: 'trials',
  admin: {
    group: 'Store',
    useAsTitle: 'id',
    defaultColumns: ['product', 'startedAt', 'expiresAt'],
  },
  defaultSort: '-startedAt',
  access: { read: storeStaff, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['product', 'deviceIdHash'], unique: true }],
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      admin: readOnly,
    },
    {
      type: 'row',
      fields: [
        { name: 'startedAt', type: 'date', required: true, admin: { ...readOnly, width: '50%' } },
        { name: 'expiresAt', type: 'date', required: true, admin: { ...readOnly, width: '50%' } },
      ],
    },
    { name: 'deviceIdHash', type: 'text', required: true, admin: { hidden: true } },
  ],
}
