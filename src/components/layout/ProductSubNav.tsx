import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { hostedProductSubpaths } from '@/lib/routes'

import { Container } from './Container'

const TABS = ['overview', ...hostedProductSubpaths] as const

export type ProductSubNavProps = {
  slug: string
  name: string
  active: (typeof TABS)[number]
}

/**
 * Sticky secondary nav for hosted products (spec §8.4), just below the 4rem header. Scrolls
 * sideways on narrow screens; the padding keeps focus outlines inside the scroll area.
 */
export function ProductSubNav({ slug, name, active }: ProductSubNavProps) {
  const t = useTranslations('ui.productSubNav')

  return (
    <nav
      aria-label={t('label', { name })}
      className="sticky top-16 z-30 border-b border-border bg-bg/85 backdrop-blur-md"
    >
      <Container className="flex items-center gap-4">
        <Link
          href={`/products/${slug}`}
          className="shrink-0 rounded-md font-display font-semibold text-fg"
        >
          {name}
        </Link>
        <ul className="-mr-1 flex min-w-0 flex-1 gap-1 overflow-x-auto p-1">
          {TABS.map((tab) => (
            <li key={tab} className="shrink-0">
              <Link
                href={tab === 'overview' ? `/products/${slug}` : `/products/${slug}/${tab}`}
                aria-current={tab === active ? 'page' : undefined}
                className="relative inline-flex h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-fg-muted transition-colors duration-(--duration-fast) after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-product-accent after:opacity-0 hover:bg-hover hover:text-fg aria-[current=page]:text-fg aria-[current=page]:after:opacity-100"
              >
                {t(tab)}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  )
}
