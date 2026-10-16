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
    // Runs before the storage handler. No shared cache may keep a file or its signed redirect:
    // Cloudflare caches .pdf paths by default, and would serve them without the access check.
    handlers: [
      (req) => {
        req.responseHeaders ??= new Headers()
        req.responseHeaders.set('Cache-Control', 'private, no-store')
      },
    ],
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
      // A lead (CVs) or an invoice (its PDF).
      name: 'owner',
      type: 'relationship',
      relationTo: ['leads', 'invoices'],
      admin: { readOnly: true },
    },
  ],
}
