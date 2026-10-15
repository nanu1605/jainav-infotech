import { ValidationError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrStaff, staff, staffOnlyField } from '@/access/roles'
import { revalidateCollection } from '@/hooks/revalidate'

/**
 * Only consented testimonials go live (spec §9.1). Draft saves are forced to `_status: 'draft'`
 * before hooks run, so this fires for publish, bulk publish, restore and non-draft writes alike.
 */
const requireConsentToPublish: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const status = data._status ?? originalDoc?._status
  // An explicit null must not fall back to the stored consent.
  const consent =
    data.consentReceived !== undefined ? data.consentReceived : originalDoc?.consentReceived
  if (status === 'published' && consent !== true) {
    throw new ValidationError(
      {
        collection: 'testimonials',
        errors: [
          {
            path: 'consentReceived',
            message: 'Record consent before publishing this testimonial.',
          },
        ],
        req,
      },
      req.t,
    )
  }
  return data
}

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    group: 'Content',
    useAsTitle: 'name',
    defaultColumns: ['name', 'company', 'product', 'consentReceived', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'company'],
  },
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    beforeChange: [requireConsentToPublish],
    ...revalidateCollection({ tag: 'testimonials' }),
  },
  fields: [
    { name: 'quote', type: 'textarea', localized: true, required: true },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'role', type: 'text', localized: true, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'company', type: 'text', admin: { width: '50%' } },
        { name: 'product', type: 'relationship', relationTo: 'products', admin: { width: '50%' } },
      ],
    },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    {
      name: 'consentReceived',
      type: 'checkbox',
      admin: {
        description:
          'The person agreed to publish this quote with their name. Required to publish.',
      },
    },
    {
      name: 'consentNote',
      type: 'textarea',
      access: { read: staffOnlyField },
      admin: { description: 'How and when consent was given. Never shown publicly.' },
    },
  ],
}
