import type { CollectionConfig } from 'payload'

import { nobody, ownerOnly, staff } from '@/access/roles'

/**
 * Personal files (spec §9.1): CVs now, invoices in Phase 7. Only server code writes them
 * (overrideAccess). Downloads go through /api/private-files/file/:filename, which checks read
 * access first; with the private bucket configured it then redirects to a 5-minute signed URL.
 */
export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  admin: {
    group: 'Leads',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'purpose', 'owner', 'filesize', 'createdAt'],
  },
  access: {
    read: staff,
    create: nobody,
    update: nobody,
    delete: ownerOnly,
  },
  upload: {
    mimeTypes: ['application/pdf'],
  },
  fields: [
    {
      name: 'purpose',
      type: 'select',
      options: ['cv', 'invoice', 'attachment'],
      required: true,
      index: true,
    },
    {
      // Polymorphic so Phase 7 can add invoices (orders) without a schema rewrite.
      name: 'owner',
      type: 'relationship',
      relationTo: ['leads'],
      admin: { readOnly: true },
    },
  ],
}
