import type { GlobalConfig } from 'payload'

import { anyone, ownerOnly } from '@/access/roles'
import { href, httpUrl } from '@/fields/validators'
import { revalidateGlobal } from '@/hooks/revalidate'

/** Company details, socials and site-wide switches (spec §9.2); the owner enters real values. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: { group: 'Settings' },
  access: { read: anyone, update: ownerOnly },
  hooks: { afterChange: [revalidateGlobal('site-settings')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Company',
          fields: [
            {
              name: 'company',
              type: 'group',
              fields: [
                {
                  name: 'legalName',
                  type: 'text',
                  defaultValue: 'Jainav Infotech Private Limited',
                },
                { name: 'cin', label: 'CIN', type: 'text' },
                { name: 'gstin', label: 'GSTIN', type: 'text' },
                { name: 'incorporationDate', type: 'date' },
                { name: 'registeredAddress', type: 'textarea' },
                { name: 'phone', type: 'text' },
                {
                  name: 'emails',
                  type: 'group',
                  fields: [
                    { name: 'hello', type: 'email' },
                    { name: 'sales', type: 'email' },
                    { name: 'support', type: 'email' },
                    { name: 'careers', type: 'email' },
                    { name: 'privacy', type: 'email' },
                  ],
                },
                { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Social',
          fields: [
            {
              name: 'socials',
              type: 'array',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'LinkedIn', value: 'linkedin' },
                    { label: 'X', value: 'x' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'GitHub', value: 'github' },
                    { label: 'Facebook', value: 'facebook' },
                  ],
                },
                { name: 'url', label: 'URL', type: 'text', required: true, validate: httpUrl },
              ],
            },
          ],
        },
        {
          label: 'Announcement',
          fields: [
            {
              name: 'announcement',
              type: 'group',
              fields: [
                { name: 'text', type: 'text', localized: true },
                { name: 'link', type: 'text', validate: href },
                { name: 'active', type: 'checkbox' },
              ],
            },
          ],
        },
        {
          label: 'Site',
          fields: [
            {
              name: 'storeEnabled',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Shows Buy buttons and customer accounts. Leave off until the store launches.',
              },
            },
            { name: 'maintenanceMode', type: 'checkbox' },
            {
              name: 'schedulerUrl',
              label: 'Scheduler URL',
              type: 'text',
              validate: httpUrl,
              admin: { description: 'Cal.com or Calendly link opened by "Book a call".' },
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'defaultSeo',
              label: 'Default SEO',
              type: 'group',
              fields: [
                { name: 'title', type: 'text', localized: true },
                { name: 'description', type: 'textarea', localized: true },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
