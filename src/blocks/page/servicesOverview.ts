import type { Block } from 'payload'

export const ServicesOverview: Block = {
  slug: 'servicesOverview',
  interfaceName: 'PageServicesOverviewBlock',
  labels: { singular: 'Services overview', plural: 'Services overviews' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    {
      name: 'services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      admin: { description: 'Leave empty to show all services.' },
    },
  ],
}
