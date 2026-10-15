import type { Field } from 'payload'

/**
 * Hindi translation status for documents with their own URL (spec §6).
 * ready → Hindi page indexable, in sitemap and hreflang. missing/draft → noindex, English fallback.
 * Must stay a top-level field so it renders in the sidebar and works as a list column/filter.
 */
export const hiStatusField: Field = {
  name: 'hiStatus',
  label: 'Hindi status',
  type: 'select',
  required: true,
  defaultValue: 'missing',
  index: true,
  options: [
    { label: 'Missing', value: 'missing' },
    { label: 'Draft', value: 'draft' },
    { label: 'Ready', value: 'ready' },
  ],
  admin: {
    position: 'sidebar',
    description: 'Ready: the Hindi page is indexed and paired with English via hreflang.',
  },
}
