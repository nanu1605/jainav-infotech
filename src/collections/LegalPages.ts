import {
  slugField,
  ValidationError,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type FieldHook,
  type PayloadRequest,
} from 'payload'

import { draftsUnlessOwner, ownerPublishesOnly } from '@/access/publishGate'
import { ownerOnly, publishedOrStaff, staff } from '@/access/roles'
import { hiStatusField } from '@/fields/hiStatus'
import { revalidateCollection } from '@/hooks/revalidate'
import { placeholdersIn } from '@/lib/placeholders'
import { publicPath } from '@/lib/routes'

const LANGUAGES = { en: 'English', hi: 'Hindi' }
const LOCALIZED_TEXT = ['title', 'body']

const refusal = (req: PayloadRequest, reason: string) =>
  new ValidationError(
    {
      collection: 'legal-pages',
      // The label goes into the error's message, the only part a production build returns.
      errors: [{ path: 'body', label: `Body. ${reason}`, message: reason }],
      req,
    },
    req.t,
  )

/**
 * Both languages go live together. Payload's "Publish in Hindi" writes only that language, so on a
 * first publish the rest of the row stays as the first save wrote it, which refuseBlanks can't see.
 */
const publishBothLanguages: CollectionBeforeOperationHook = ({ args, req }) => {
  if ((args as { publishSpecificLocale?: string }).publishSpecificLocale) {
    throw refusal(req, 'Legal pages go live in both languages at once. Use Publish.')
  }
  return args
}

/**
 * Publishing counts as approval (spec §8.13), so a page that would print a `{{BLANK}}` in either
 * language stays a draft. A field's `validate` sees one language. A field hook also gets
 * siblingDocWithLocales, which Payload writes the other languages from, so this reads the text that
 * would really go live on every route: publish, bulk, duplicate, restore. It runs before the write,
 * because a bulk publish commits past a document that fails later on. It sits on `version` only
 * because a field hook needs a host, and this field is on every page.
 *
 * allowPlaceholders is seed:publish, which only runs against a local database.
 */
const refuseBlanks: FieldHook = ({
  data,
  originalDoc,
  req,
  siblingData,
  siblingDocWithLocales,
  value,
}) => {
  if ((data?._status ?? originalDoc?._status) !== 'published' || req.context.allowPlaceholders) {
    return value
  }
  const stored = (siblingDocWithLocales ?? {}) as Record<string, Record<string, unknown>>
  const blanks = Object.entries(LANGUAGES).flatMap(([locale, language]) => {
    const text = LOCALIZED_TEXT.map((field) => {
      const written = locale === req.locale ? siblingData[field] : stored[field]?.[locale]
      // A create with locale=all keeps what it was sent; an update ignores it.
      return written ?? (req.locale === 'all' ? siblingData[field]?.[locale] : undefined)
    })
    const found = placeholdersIn([...text, siblingData.version, siblingData.slug])
    // Spaces, not commas: the admin's toast splits its message at every comma.
    return found.length ? [`${language}: ${found.join(' ')}`] : []
  })
  if (blanks.length) throw refusal(req, `Fill these in first. ${blanks.join('. ')}.`)
  return value
}

export const LegalPages: CollectionConfig = {
  slug: 'legal-pages',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'effectiveDate', 'hiStatus', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description:
      'Editors save drafts; only the Owner can publish, and publishing counts as approval. Version history is kept.',
  },
  // Keep every version: published texts are what visitors and buyers agreed to (spec §8.13).
  versions: { drafts: true, maxPerDoc: 0 },
  access: {
    read: publishedOrStaff,
    readVersions: staff,
    create: draftsUnlessOwner,
    update: draftsUnlessOwner,
    delete: ownerOnly,
  },
  hooks: {
    beforeOperation: [ownerPublishesOnly, publishBothLanguages],
    ...revalidateCollection({
      tag: 'legal-pages',
      paths: ({ slug }) => (slug ? [publicPath['legal-pages'](slug)] : []),
    }),
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'body', type: 'richText', localized: true },
    slugField({ useAsSlug: 'title' }),
    {
      name: 'version',
      type: 'text',
      required: true,
      hooks: { beforeChange: [refuseBlanks] },
      admin: {
        position: 'sidebar',
        description: 'Shown on the page, e.g. 1.0. Bump it on every change.',
      },
    },
    {
      name: 'effectiveDate',
      type: 'date',
      required: true, // enforced on publish; draft saves skip validation
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    hiStatusField,
  ],
}
