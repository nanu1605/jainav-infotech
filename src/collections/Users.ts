import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { hasRole, isStaff, ownerOnly, ownerOnlyField, ROLES, staff } from '@/access/roles'

/** The very first admin account becomes the owner; later accounts default to editor. */
const firstUserIsOwner: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({
      collection: 'users',
      overrideAccess: true,
      req,
    })
    if (totalDocs === 0) data.roles = ['owner']
  }
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    group: 'System',
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'roles', 'updatedAt'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    admin: ({ req: { user } }) => isStaff(user),
    read: staff,
    create: ownerOnly,
    delete: ownerOnly,
    // Otherwise any admin could clear the owner's login lockout (spec §16).
    unlock: ownerOnly,
    update: ({ req: { user } }) =>
      hasRole(user, 'owner') ? true : user ? { id: { equals: user.id } } : false,
  },
  hooks: {
    beforeChange: [firstUserIsOwner],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      saveToJWT: true,
      defaultValue: ['editor'],
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Editor', value: 'editor' },
        { label: 'Support', value: 'support' },
      ] satisfies { label: string; value: (typeof ROLES)[number] }[],
      access: { create: ownerOnlyField, update: ownerOnlyField },
      admin: { position: 'sidebar' },
    },
  ],
}
