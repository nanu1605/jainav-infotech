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
  /** "en" when the text is the English fallback on a Hindi page (WCAG 3.1.2). */
  lang?: string
}

// Root-relative paths that are not pages: left as typed. Same exclusions as the locale proxy.
const NOT_A_PAGE =
  /^\/(?:hi|admin|api|go|feeds|og|_next)(?:[/?#]|$)|^\/(?:robots\.txt|sitemap\.xml)$/

const converters =
  (locale: Locale): JSXConvertersFunction =>
  ({ defaultConverters }) => {
    const links = LinkJSXConverter({
      internalDocToHref: ({ linkNode }) => {
        const doc = linkNode.fields.doc
        const toPath = doc && publicPath[doc.relationTo as RoutedCollection]
        const slug = doc && typeof doc.value === 'object' ? (doc.value.slug as string) : null
        return toPath && slug ? localizedPath(locale, toPath(slug)) : '#'
      },
    })
    return {
      ...defaultConverters,
      ...links,
      // A typed "/contact" on a Hindi page should stay in Hindi, like internal links do.
      link: (args) => {
        const url = args.node.fields.url
        const localize =
          args.node.fields.linkType !== 'internal' &&
          typeof url === 'string' &&
          url.startsWith('/') &&
          !url.startsWith('//') &&
          !NOT_A_PAGE.test(url)
        const node = localize
          ? { ...args.node, fields: { ...args.node.fields, url: localizedPath(locale, url) } }
          : args.node
        const base = links.link
        return typeof base === 'function' ? base({ ...args, node }) : null
      },
      // The page title is the only h1; deeper levels than the prose styles cover become h4.
      heading: ({ node, nodesToJSX }) => {
        const Tag =
          node.tag === 'h1' ? 'h2' : node.tag === 'h5' || node.tag === 'h6' ? 'h4' : node.tag
        return <Tag>{nodesToJSX({ nodes: node.children })}</Tag>
      },
    }
  }

/** CMS rich text with the site's prose styles. Links stay in the page's language. */
export function RichText({ data, locale, className, lang }: Props) {
  if (!data?.root?.children?.length) return null
  return (
    <div lang={lang} className={cn('prose', className)}>
      <LexicalRichText data={data} converters={converters(locale)} disableContainer />
    </div>
  )
}
