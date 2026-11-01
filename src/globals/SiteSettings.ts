import type { GlobalConfig } from 'payload'

import { anyone, ownerOnly } from '@/access/roles'
import { href, httpUrl, whatsappNumber } from '@/fields/validators'
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
                {
                  name: 'businessHours',
                  type: 'textarea',
                  localized: true,
                  admin: {
                    description: 'Shown on the Contact page, e.g. Mon–Sat, 10:00–19:00 IST.',
                  },
                },
                {
                  name: 'phone',
                  type: 'text',
                  admin: { description: 'As shown on the site, e.g. +91 98765 43210.' },
                },
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
                {
                  name: 'whatsapp',
                  label: 'WhatsApp',
                  type: 'text',
                  validate: whatsappNumber,
                  admin: { description: 'Digits only with the country code, e.g. 919876543210.' },
                },
                {
                  name: 'grievanceOfficer',
                  type: 'group',
                  admin: {
                    description:
                      'The person to contact for queries and grievances. The footer shows them once the name is set.',
                  },
                  fields: [
                    { name: 'name', type: 'text', localized: true },
                    {
                      name: 'title',
                      type: 'text',
                      localized: true,
                      admin: { description: 'Their designation, e.g. Director.' },
                    },
                  ],
                },
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
