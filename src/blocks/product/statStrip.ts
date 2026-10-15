import type { Block } from 'payload'

import { statsField } from '@/fields/stats'

export const StatStrip: Block = {
  slug: 'statStrip',
  interfaceName: 'ProductStatStripBlock',
  labels: { singular: 'Stat strip', plural: 'Stat strips' },
  fields: [statsField],
}
