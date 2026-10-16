import { PageBlocks } from '@/components/blocks/PageBlocks'
import type { Locale } from '@/i18n/routing'
import type { Page } from '@/payload-types'
import { publicPath } from '@/lib/routes'

import { PageHeader } from './PageHeader'

/** A block-built page. Pages that don't open with a hero get a title header (and the h1). */
export function PageView({ page, locale }: { page: Page; locale: Locale }) {
  const opensWithHero = page.layout?.[0]?.blockType === 'hero'
  return (
    <main id="main" className="scroll-mt-16">
      {!opensWithHero && page.slug !== 'home' && (
        <PageHeader
          title={page.title ?? ''}
          crumbs={[{ label: page.title ?? '', href: publicPath.pages(page.slug ?? '') }]}
          locale={locale}
        />
      )}
      <PageBlocks blocks={page.layout} locale={locale} />
    </main>
  )
}
