import {
  APIError,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type FieldAccess,
  type FieldHook,
  type PayloadHandler,
  type Where,
} from 'payload'
import { z } from 'zod'

import { leadHandlers, nobody, ownerOnly, staff } from '@/access/roles'
import { routing } from '@/i18n/routing'
import { istDateTime, toCsv } from '@/lib/csv'
import { istDate } from '@/lib/format'
import type { Lead } from '@/payload-types'

/** Emails are matched across leads and data requests, so store them normalized. */
export const normalizeEmail: FieldHook = ({ value }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value

// Only server code (Local API, overrideAccess) ever reads or writes the token hash.
const noFieldAccess: FieldAccess = () => false
/**
 * What the visitor submitted and agreed to is a record: the API ignores staff edits to it
 * (admin readOnly only hides the inputs). Server code writes it with overrideAccess.
 */
const record = { update: noFieldAccess }

const SEARCHABLE = ['email', 'name', 'company']

/**
 * A deleted lead takes its CV with it (spec §16). Before the delete, like Payload's own file
 * cleanup: deleting the lead row also drops the links. Files it lists or that name it as owner
 * (the owner link is written separately and may be missing).
 */
const deleteOwnFiles: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const lead = await req.payload.findByID({
    collection: 'leads',
    id,
    select: { attachments: true },
    depth: 0,
    overrideAccess: true,
    req,
  })
  const attached = (lead.attachments ?? []).map((file) =>
    typeof file === 'object' ? file.id : file,
  )
  const owned: Where = {
    and: [{ 'owner.relationTo': { equals: 'leads' } }, { 'owner.value': { equals: id } }],
  }
  const { errors } = await req.payload.delete({
    collection: 'private-files',
    where: attached.length ? { or: [owned, { id: { in: attached } }] } : owned,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (errors.length) throw new APIError('Could not delete the lead’s files.', 500)
}

// The list view's own query string: where (qs-parsed by Payload), search and sort.
const exportQuery = z.object({
  where: z.record(z.string(), z.unknown()).optional(),
  search: z.string().max(200).optional(),
  sort: z.string().max(100).optional(),
})

const yesNo = (value: boolean | null | undefined) => (value ? 'yes' : 'no')

const CSV_COLUMNS: [string, (lead: Lead) => unknown][] = [
  ['Created (IST)', (l) => istDateTime(l.createdAt)],
  ['Type', (l) => l.type],
  ['Status', (l) => l.status],
  ['Product', (l) => (typeof l.product === 'object' ? l.product?.name : l.product)],
  ['Name', (l) => l.name],
  ['Email', (l) => l.email],
  ['Phone', (l) => l.phone],
  ['Company', (l) => l.company],
  ['Message', (l) => l.message],
  ['Topic', (l) => detailsOf(l).topic],
  [
    'Details',
    (l) => {
      const { topic: _topic, ...rest } = detailsOf(l)
      return Object.keys(rest).length ? JSON.stringify(rest) : ''
    },
  ],
  ['Locale', (l) => l.locale],
  ['Page', (l) => l.source?.page],
  ['Referrer', (l) => l.source?.referrer],
  ['UTM source', (l) => l.source?.utm?.source],
  ['UTM medium', (l) => l.source?.utm?.medium],
  ['UTM campaign', (l) => l.source?.utm?.campaign],
  ['Consent version', (l) => l.consent?.textVersion],
  ['Consent given at (IST)', (l) => istDateTime(l.consent?.givenAt)],
  ['Marketing consent', (l) => yesNo(l.marketingConsent?.given)],
  ['Marketing at (IST)', (l) => istDateTime(l.marketingConsent?.at)],
  ['Marketing withdrawn at (IST)', (l) => istDateTime(l.marketingConsent?.withdrawnAt)],
  ['Confirmed at (IST)', (l) => istDateTime(l.confirmedAt)],
  ['Unsubscribed at (IST)', (l) => istDateTime(l.unsubscribedAt)],
  ['Assigned to', (l) => (typeof l.assignedTo === 'object' ? l.assignedTo?.email : l.assignedTo)],
]

function detailsOf(lead: Lead): Record<string, unknown> {
  const { details } = lead
  if (details && typeof details === 'object' && !Array.isArray(details)) return details
  return details == null ? {} : { value: details }
}

/**
 * GET /api/leads/export (spec §10): the leads the admin list shows, as CSV. Payload's read access
 * applies (overrideAccess: false), so only staff get rows.
 */
const exportLeads: PayloadHandler = async (req) => {
  const query = exportQuery.safeParse(req.query)
  if (!query.success) throw new APIError('Invalid export query.', 400)
  const { where, search, sort = '-createdAt' } = query.data
  const filters: Where[] = []
  if (where) filters.push(where as Where)
  if (search) filters.push({ or: SEARCHABLE.map((field) => ({ [field]: { like: search } })) })

  // ponytail: one query holds every matching lead in memory; page through them past ~50k leads.
  const { docs } = await req.payload.find({
    collection: 'leads',
    where: { and: filters },
    sort,
    pagination: false,
    depth: 1,
    overrideAccess: false,
    req,
  })
  const rows = [
    CSV_COLUMNS.map(([label]) => label),
    ...docs.map((lead) => CSV_COLUMNS.map(([, cell]) => cell(lead))),
  ]
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${istDate()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Form submissions (spec §9.1, §13). Personal data: staff-only reads, and never created through
 * REST — the Phase 4 forms API writes through the Local API.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    group: 'Leads',
    useAsTitle: 'email',
    defaultColumns: ['email', 'type', 'product', 'status', 'createdAt'],
    listSearchableFields: SEARCHABLE,
    components: { beforeListTable: ['@/components/admin/ExportLeads#ExportLeads'] },
  },
  access: {
    read: staff,
    create: nobody,
    update: leadHandlers,
    delete: ownerOnly,
  },
  hooks: { beforeDelete: [deleteOwnFiles] },
  endpoints: [{ path: '/export', method: 'get', handler: exportLeads }],
  fields: [
    {
      name: 'reply',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/admin/LeadReply#LeadReply' },
      },
    },
    {
      name: 'status',
      type: 'select',
      options: ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'],
      defaultValue: 'new',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    { name: 'notes', type: 'textarea', admin: { position: 'sidebar' } },
    {
      // What the visitor submitted and agreed to is a record: those fields deny updates (and so
      // render read-only); withdrawnAt and unsubscribedAt stay editable for staff.
      type: 'collapsible',
      label: 'Submission',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            'contact',
            'project',
            'waitlist',
            'newsletter',
            'demo',
            'careers',
            'partnership',
          ],
          required: true,
          index: true,
          access: record,
        },
        { name: 'product', type: 'relationship', relationTo: 'products', access: record },
        { name: 'name', type: 'text', access: record },
        {
          name: 'email',
          type: 'email',
          required: true,
          index: true,
          access: record,
          hooks: { beforeValidate: [normalizeEmail] },
        },
        { name: 'phone', type: 'text', access: record },
        { name: 'company', type: 'text', access: record },
        { name: 'message', type: 'textarea', access: record },
        { name: 'details', type: 'json', access: record },
        {
          name: 'attachments',
          type: 'relationship',
          relationTo: 'private-files',
          hasMany: true,
          access: record,
        },
        { name: 'locale', type: 'select', options: [...routing.locales], access: record },
        {
          name: 'source',
          type: 'group',
          access: record,
          fields: [
            { name: 'page', type: 'text' },
            { name: 'referrer', type: 'text' },
            {
              name: 'utm',
              label: 'UTM',
              type: 'group',
              fields: [
                { name: 'source', type: 'text' },
                { name: 'medium', type: 'text' },
                { name: 'campaign', type: 'text' },
                { name: 'term', type: 'text' },
                { name: 'content', type: 'text' },
              ],
            },
          ],
        },
        {
          name: 'consent',
          type: 'group',
          access: record,
          fields: [
            { name: 'textVersion', type: 'text' },
            { name: 'givenAt', type: 'date' },
            { name: 'ipHash', label: 'IP hash', type: 'text' },
          ],
        },
        {
          name: 'marketingConsent',
          type: 'group',
          fields: [
            { name: 'given', type: 'checkbox', access: record },
            { name: 'at', type: 'date', access: record },
            { name: 'textVersion', type: 'text', access: record },
            // Staff may record a withdrawal (spec §16: withdrawing is as easy as giving).
            { name: 'withdrawnAt', type: 'date' },
          ],
        },
        {
          name: 'confirmTokenHash',
          type: 'text',
          index: true, // Phase 4 newsletter confirm looks leads up by this hash
          access: { read: noFieldAccess, create: noFieldAccess, update: noFieldAccess },
          admin: { hidden: true },
        },
        { name: 'confirmedAt', type: 'date', access: record },
        { name: 'unsubscribedAt', type: 'date' },
      ],
    },
  ],
}
