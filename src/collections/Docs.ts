import { slugField, type CollectionConfig, type Where } from 'payload'
import { extractID } from 'payload/shared'

import { contentEditors, publishedOrStaff, staff } from '@/access/roles'
import { hiStatusField } from '@/fields/hiStatus'
import { integer } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'

/** Hosted-product documentation, nested via `parent` (spec §7 /products/[slug]/docs/[[...path]]). */
export const Docs: CollectionConfig = {
  slug: 'docs',
  admin: {
    group: 'Products',
    useAsTitle: 'title',
    defaultColumns: ['title', 'product', 'parent', 'hiStatus', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
  },
  defaultSort: 'sortOrder',
  versions: { drafts: true, maxPerDoc: 50 },
  // Slugs are unique per product, not site-wide.
  indexes: [{ fields: ['product', 'slug'], unique: true }],
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({ tag: 'docs' }),
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      admin: { position: 'sidebar' },
    },
    slugField({ useAsSlug: 'title', disableUnique: true }),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'docs',
      // ponytail: blocks self-parenting only; a deeper cycle (A → B → A) needs a tree walk.
      filterOptions: ({ id, data }) => {
        const product = data?.product as number | { id: number } | null | undefined
        if (product == null) return false
        const where: Where = { product: { equals: extractID(product) } }
        if (id) where.id = { not_equals: id }
        return where
      },
      admin: {
        position: 'sidebar',
        description: 'Nest this page under another doc of the same product.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      validate: integer,
      admin: { position: 'sidebar', step: 1 },
    },
    hiStatusField,
  ],
}
