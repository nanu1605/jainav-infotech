import type { Block } from 'payload'

export const Team: Block = {
  slug: 'team',
  interfaceName: 'PageTeamBlock',
  labels: { singular: 'Team', plural: 'Team blocks' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'team',
      hasMany: true,
      admin: { description: 'Leave empty to show the whole team.' },
    },
  ],
}
