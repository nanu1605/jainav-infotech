import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import {
  LinkJSXConverter,
  RichText as LexicalRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'

import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'
import { publicPath, type RoutedCollection } from '@/lib/routes'
import { localizedPath } from '@/lib/seo'

type Props = {
  data: SerializedEditorState | null | undefined
  locale: Locale
  className?: string
}

const converters =
  (locale: Locale): JSXConvertersFunction =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({
      internalDocToHref: ({ linkNode }) => {
        const doc = linkNode.fields.doc
        const toPath = doc && publicPath[doc.relationTo as RoutedCollection]
        const slug = doc && typeof doc.value === 'object' ? (doc.value.slug as string) : null
        return toPath && slug ? localizedPath(locale, toPath(slug)) : '#'
      },
    }),
  })

/** CMS rich text with the site's prose styles. Internal links stay in the page's language. */
export function RichText({ data, locale, className }: Props) {
  if (!data?.root?.children?.length) return null
  return (
    <LexicalRichText
      data={data}
      converters={converters(locale)}
      disableContainer={false}
      className={cn('prose', className)}
    />
  )
}
