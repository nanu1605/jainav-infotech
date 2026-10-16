import type { CollectionConfig } from 'payload'

import { anyone, contentEditors } from '@/access/roles'
import { httpUrl, integer } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'

export const Team: CollectionConfig = {
  slug: 'team',
  labels: { singular: 'Team member', plural: 'Team' },
  admin: {
    group: 'Content',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'founder', 'sortOrder', 'updatedAt'],
    listSearchableFields: ['name'],
  },
  defaultSort: 'sortOrder',
  access: {
    read: anyone,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({ tag: 'team' }),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', localized: true },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
      admin: { description: 'A blank line starts a new paragraph.' },
    },
    {
      name: 'quote',
      type: 'textarea',
      localized: true,
      admin: { description: 'Founder section: shown on the photo.' },
    },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'links',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', localized: true, admin: { width: '50%' } },
            {
              name: 'url',
              type: 'text',
              required: true,
              validate: httpUrl,
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
    {
      name: 'founder',
      type: 'checkbox',
      admin: { position: 'sidebar', description: 'Shown in the founder section on About.' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      validate: integer,
      admin: { position: 'sidebar', step: 1 },
    },
  ],
}
