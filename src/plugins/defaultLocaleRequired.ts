import type { Block, Config, Field, Plugin, Validate } from 'payload'
import { richText, text, textarea } from 'payload/shared'

/**
 * Spec §6: Hindi may be partial and falls back to English. Payload validates `required` against
 * the locale being saved, so a required localized field would block saving or publishing from
 * the Hindi admin until every row is translated, and non-draft tables get NOT NULL locale
 * columns. This plugin turns `required` on localized fields into "required in English": the
 * field is optional in the schema and its validator only insists on a value in the default locale.
 */
const DEFAULT_LOCALE = 'en'

// Payload's own per-type validators, which a custom `validate` would otherwise replace.
const builtIn = { text, textarea, richText } as unknown as Record<string, Validate | undefined>

type Lexical = { root?: { children?: { children?: unknown[] }[] } }
const isEmpty = (value: unknown) =>
  value == null ||
  value === '' ||
  (typeof value === 'object' &&
    'root' in value &&
    !(value as Lexical).root?.children?.some((node) => (node.children?.length ?? 0) > 0))

const requiredInDefaultLocale =
  (inner: Validate | undefined): Validate =>
  (value, options) => {
    if (isEmpty(value)) {
      const locale = options.req?.locale
      return locale && locale !== DEFAULT_LOCALE ? true : options.req.t('validation:required')
    }
    return inner ? inner(value, options) : true
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
