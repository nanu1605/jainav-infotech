import type { CollectionConfig } from 'payload'

import { nobody, ownerOnly } from '@/access/roles'

/** Who changed what (spec §9.1). Written only by src/plugins/audit.ts through the Local API. */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: {
    group: 'System',
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'actorEmail', 'createdAt'],
    listSearchableFields: ['summary', 'entity', 'docId'],
  },
  access: {
    read: ownerOnly,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  defaultSort: '-createdAt',
  disableDuplicate: true,
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    // Snapshot: the relationship is cleared if the user is deleted later.
    { name: 'actorEmail', type: 'text' },
    { name: 'action', type: 'select', options: ['create', 'update', 'delete'], required: true },
    { name: 'entity', type: 'text', required: true, index: true },
    { name: 'docId', type: 'text', index: true },
    { name: 'summary', type: 'text' },
  ],
}
