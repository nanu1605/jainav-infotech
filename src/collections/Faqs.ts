import type { CollectionConfig } from 'payload'

import { anyone, contentEditors } from '@/access/roles'
import { integer } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  admin: {
    group: 'Content',
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', 'product', 'sortOrder', 'updatedAt'],
    listSearchableFields: ['question'],
  },
  defaultSort: 'sortOrder',
  access: {
    read: anyone,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({ tag: 'faqs' }),
  },
  fields: [
    { name: 'question', type: 'text', localized: true, required: true },
    { name: 'answer', type: 'textarea', localized: true, required: true },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      admin: { position: 'sidebar', description: 'Leave empty for a company-wide question.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Pricing', value: 'pricing' },
        { label: 'Licensing', value: 'licensing' },
        { label: 'Devices', value: 'devices' },
        { label: 'Refunds', value: 'refunds' },
        { label: 'Updates', value: 'updates' },
        { label: 'Services', value: 'services' },
        { label: 'Careers', value: 'careers' },
        { label: 'Privacy', value: 'privacy' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      validate: integer,
      admin: { position: 'sidebar', step: 1 },
    },
  ],
}
