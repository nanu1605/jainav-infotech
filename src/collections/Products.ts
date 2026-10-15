import { slugField, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrStaff, staff } from '@/access/roles'
import { productBlocks } from '@/blocks/product'
import { hiStatusField } from '@/fields/hiStatus'
import { productButtonField } from '@/fields/productButton'
import { hexColor, httpUrl, integer } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'
import { hostedProductSubpaths, publicPath } from '@/lib/routes'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    group: 'Products',
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'status',
      'hostingMode',
      'featured',
      'hiStatus',
      '_status',
      'updatedAt',
    ],
    listSearchableFields: ['name', 'slug'],
  },
  defaultSort: 'sortOrder',
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({
      tag: 'products',
      paths: ({ slug, hostingMode }) => {
        if (!slug) return []
        const page = publicPath.products(slug)
        return hostingMode === 'hosted'
          ? [page, ...hostedProductSubpaths.map((sub) => `${page}/${sub}`)]
          : [page]
      },
    }),
  },
  fields: [
    // The SEO plugin appends its tab here, so tabs must stay the first field.
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Basics',
          fields: [
            { name: 'name', type: 'text', localized: true, required: true },
            { name: 'tagline', type: 'text', localized: true, required: true },
            { name: 'summary', type: 'textarea', localized: true },
            {
              type: 'row',
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'SaaS', value: 'saas' },
                    { label: 'Desktop', value: 'desktop' },
                    { label: 'Mobile', value: 'mobile' },
                    { label: 'Web', value: 'web' },
                    { label: 'API', value: 'api' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'category',
                  type: 'select',
                  required: true,
                  defaultValue: 'other',
                  options: [
                    { label: 'Restaurants', value: 'restaurants' },
                    { label: 'PC tools', value: 'pc-tools' },
                    { label: 'Assistants', value: 'assistants' },
                    { label: 'Other', value: 'other' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'platforms',
              type: 'select',
              hasMany: true,
              options: [
                { label: 'Windows', value: 'windows' },
                { label: 'macOS', value: 'macos' },
                { label: 'Linux', value: 'linux' },
                { label: 'Web', value: 'web' },
                { label: 'Android', value: 'android' },
                { label: 'iOS', value: 'ios' },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  // The default name enum_products_status collides with the drafts `_status` enum.
                  enumName: ({ tableName }) => `enum_${tableName}_lifecycle`,
                  required: true,
                  defaultValue: 'coming-soon',
                  options: [
                    { label: 'Live', value: 'live' },
                    { label: 'Beta', value: 'beta' },
                    { label: 'Coming soon', value: 'coming-soon' },
                    { label: 'Retired', value: 'retired' },
                  ],
                  admin: {
                    width: '50%',
                    description: 'Coming soon replaces every button with "Join the waitlist".',
                  },
                },
                {
                  name: 'hostingMode',
                  type: 'select',
                  required: true,
                  defaultValue: 'external',
                  options: [
                    { label: 'External (showcase page)', value: 'external' },
                    { label: 'Hosted (pricing, downloads, docs here)', value: 'hosted' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'externalUrl',
              type: 'text',
              validate: httpUrl,
              admin: { description: "The product's own website. Required for a Visit button." },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'launchDate',
                  type: 'date',
                  admin: { width: '50%', date: { pickerAppearance: 'dayOnly' } },
                },
                {
                  name: 'accentColor',
                  type: 'text',
                  required: true,
                  validate: hexColor,
                  admin: { width: '50%', description: '6-digit hex. Used for the card glow.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Media',
          fields: [
            { name: 'logo', type: 'upload', relationTo: 'media' },
            { name: 'icon', type: 'upload', relationTo: 'media' },
            { name: 'heroMedia', type: 'upload', relationTo: 'media' },
            {
              name: 'cardPreview',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'A short, muted video loop played on the product card.' },
            },
          ],
        },
        {
          label: 'Page',
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: productBlocks,
              admin: { initCollapsed: true },
            },
          ],
        },
        {
          label: 'Buttons & Links',
          fields: [
            productButtonField({ name: 'primaryButton', label: 'Primary button', required: true }),
            productButtonField({ name: 'secondaryButton', label: 'Secondary button' }),
            {
              name: 'secondaryLinks',
              type: 'array',
              admin: { description: 'Shown in a row under the hero.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'kind',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Docs', value: 'docs' },
                        { label: 'Microsoft Store', value: 'microsoft-store' },
                        { label: 'Google Play', value: 'play-store' },
                        { label: 'App Store', value: 'app-store' },
                        { label: 'GitHub', value: 'github' },
                        { label: 'Status page', value: 'status' },
                        { label: 'Other', value: 'other' },
                      ],
                      admin: { width: '30%' },
                    },
                    { name: 'label', type: 'text', localized: true, admin: { width: '30%' } },
                    {
                      name: 'url',
                      type: 'text',
                      required: true,
                      validate: httpUrl,
                      admin: { width: '40%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Pricing',
          admin: { condition: (data) => data?.hostingMode === 'hosted' },
          fields: [
            {
              name: 'plans',
              type: 'join',
              collection: 'plans',
              on: 'product',
              defaultSort: 'sortOrder',
              admin: {
                defaultColumns: ['name', 'code', 'billing', 'priceINR', 'active'],
                description: 'Plans of this product. They are edited in Products → Plans.',
              },
            },
          ],
        },
      ],
    },
    slugField({ useAsSlug: 'name' }),
    hiStatusField,
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Feature on the home page.' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      validate: integer,
      admin: { position: 'sidebar', step: 1 },
    },
  ],
}
