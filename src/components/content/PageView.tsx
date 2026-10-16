import { PageBlocks } from '@/components/blocks/PageBlocks'
import type { Locale } from '@/i18n/routing'
import type { Page } from '@/payload-types'
import { publicPath } from '@/lib/routes'
import { fallbackLang } from '@/lib/seo'

import { PageHeader } from './PageHeader'

/** A block-built page. Pages that don't open with a hero get a title header (and the h1). */
export function PageView({ page, locale }: { page: Page; locale: Locale }) {
  const opensWithHero = page.layout?.[0]?.blockType === 'hero'
  const lang = fallbackLang(locale, page.hiStatus)
  return (
    <main id="main" className="scroll-mt-16">
      {/* Home without an opening hero still needs its h1 (a breadcrumb header would read "Home"). */}
      {!opensWithHero && page.slug === 'home' && (
        <h1 lang={lang} className="sr-only">
          {page.title}
        </h1>
      )}
      {!opensWithHero && page.slug !== 'home' && (
        <PageHeader
          title={page.title ?? ''}
          crumbs={[{ label: page.title ?? '', href: publicPath.pages(page.slug ?? '') }]}
          locale={locale}
          lang={lang}
        />
      )}
      <div lang={lang}>
        <PageBlocks blocks={page.layout} locale={locale} />
      </div>
    </main>
  )
}
