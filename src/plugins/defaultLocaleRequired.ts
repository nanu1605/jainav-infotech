import type { Block, Config, Field, Plugin, Validate } from 'payload'
import { richText, text, textarea } from 'payload/shared'

/**
 * Spec §6: Hindi may be partial and falls back to English. Payload validates `required` against
 * the locale being saved, so a required localized field would block saving or publishing from
 * the Hindi admin until every row is translated, and non-draft tables get NOT NULL locale
 * columns. This plugin turns `required` on localized fields into "required in English": the
 * field is optional in the schema, and its validator applies `required` only when saving the
 * default locale or creating a document (a new document has no English yet).
 */
const DEFAULT_LOCALE = 'en'

// Payload's own per-type validators, which a custom `validate` would otherwise replace.
const builtIn = { text, textarea, richText } as unknown as Record<string, Validate | undefined>

// Passing `required` through keeps Payload's own emptiness rules per type (e.g. rich text hasText).
const requiredInDefaultLocale =
  (inner: Validate | undefined): Validate =>
  (value, options) => {
    const locale = options.req?.locale
    const required = !locale || locale === DEFAULT_LOCALE || options.operation === 'create'
    if (inner) return inner(value, { ...options, required })
    return !required || (value != null && value !== '')
      ? true
      : options.req.t('validation:required')
  }

function relax(field: Field): Field {
  if (field.type === 'tabs') {
    return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: tab.fields.map(relax) })) }
  }
  if (field.type === 'blocks') {
    return {
      ...field,
      blocks: field.blocks.map((block: Block) => ({ ...block, fields: block.fields.map(relax) })),
    }
  }
  if ('fields' in field && Array.isArray(field.fields)) {
    return { ...field, fields: field.fields.map(relax) } as Field
  }
  if ('localized' in field && field.localized && 'required' in field && field.required) {
    const inner =
      ('validate' in field ? (field.validate as Validate | undefined) : undefined) ??
      builtIn[field.type]
    return { ...field, required: false, validate: requiredInDefaultLocale(inner) } as Field
  }
  return field
}

export const defaultLocaleRequiredPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((c) => ({ ...c, fields: c.fields.map(relax) })),
  globals: config.globals?.map((g) => ({ ...g, fields: g.fields.map(relax) })),
})
