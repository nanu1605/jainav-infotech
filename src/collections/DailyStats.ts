import type { CollectionConfig } from 'payload'

import { nobody, staff } from '@/access/roles'
import { integer, isoDate } from '@/fields/validators'

/**
 * Server-side counters of record (spec §8.6, §17). Phase 3 increments them with a raw
 * `INSERT … ON CONFLICT (date, kind, key)` upsert, so `date` is the IST business date as text.
 */
export const DailyStats: CollectionConfig = {
  slug: 'daily-stats',
  admin: {
    group: 'System',
    useAsTitle: 'key',
    defaultColumns: ['date', 'kind', 'key', 'count'],
    listSearchableFields: ['key'],
  },
  access: {
    read: staff,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  defaultSort: '-date',
  indexes: [{ fields: ['date', 'kind', 'key'], unique: true }],
  fields: [
    { name: 'date', type: 'text', required: true, validate: isoDate },
    { name: 'kind', type: 'select', options: ['go-click', 'download'], required: true },
    { name: 'key', type: 'text', required: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0, min: 0, validate: integer },
  ],
}
