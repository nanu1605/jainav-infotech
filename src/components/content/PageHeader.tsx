import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Container } from '@/components/layout/Container'
import type { Locale } from '@/i18n/routing'
import { absoluteUrl } from '@/lib/seo'

import { JsonLd } from './JsonLd'

export type Crumb = { label: string; href: string }

/**
 * Title area of inner pages: breadcrumbs (with BreadcrumbList data, spec §15), h1, intro.
 * `crumbs` runs from the first level below home to the current page.
 */
export function PageHeader({
  title,
  intro,
  crumbs,
  locale,
  children,
}: {
  title: string
  intro?: ReactNode
  crumbs: Crumb[]
  locale: Locale
  children?: ReactNode
}) {
  const t = useTranslations('ui.breadcrumbs')
  const items = [{ label: t('home'), href: '/' }, ...crumbs]
  return (
    <header className="border-b border-border bg-bg-subtle">
      <Container className="py-12 sm:py-16">
        <Breadcrumbs items={items} />
        <h1 className="mt-6 max-w-3xl font-display text-4xl leading-tight font-bold text-balance text-fg sm:text-5xl [&:not(:lang(hi))]:tracking-tight">
          {title}
        </h1>
        {intro && <div className="mt-4 max-w-2xl text-lg text-pretty text-fg-muted">{intro}</div>}
        {children}
      </Container>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.label,
            item: absoluteUrl(locale, item.href),
          })),
        }}
      />
    </header>
  )
}
