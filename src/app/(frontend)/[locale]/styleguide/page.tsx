import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ComponentType } from 'react'

import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

import Actions from './sections/Actions'
import Content from './sections/Content'
import Feedback from './sections/Feedback'
import Forms from './sections/Forms'
import Layout from './sections/Layout'
import Media from './sections/Media'
import Motion from './sections/Motion'
import Navigation from './sections/Navigation'
import Product from './sections/Product'

/** Development and staging only (spec §5.6): production 404s unless ENABLE_STYLEGUIDE=1. */
const enabled = () => process.env.NODE_ENV !== 'production' || process.env.ENABLE_STYLEGUIDE === '1'

const AREAS = [
  ['actions', Actions],
  ['content', Content],
  ['media', Media],
  ['forms', Forms],
  ['feedback', Feedback],
  ['layout', Layout],
  ['navigation', Navigation],
  ['motion', Motion],
  ['product', Product],
] as const satisfies readonly (readonly [string, ComponentType])[]

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function StyleguidePage({ params }: { params: Promise<{ locale: string }> }) {
  if (!enabled()) notFound()
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('styleguide')

  return (
    <main className="mx-auto max-w-[96rem] px-4 py-10 sm:px-6">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-fg-muted">{t('intro')}</p>
          <nav aria-label={t('sections')} className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {AREAS.map(([id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-fg-muted underline-offset-4 hover:text-fg hover:underline"
              >
                {t(`areas.${id}`)}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      {AREAS.map(([id, Section]) => (
        <section key={id} id={id} aria-labelledby={`${id}-title`} className="mb-16 scroll-mt-8">
          <h2 id={`${id}-title`} className="mb-4 font-display text-2xl font-semibold">
            {t(`areas.${id}`)}
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {(['light', 'dark'] as const).map((theme) => (
              <div
                key={theme}
                data-theme={theme}
                data-testid={`${id}-${theme}`}
                className="min-w-0 rounded-xl border border-border bg-bg p-4 text-fg sm:p-6"
              >
                <p className="mb-4 text-xs font-medium text-fg-muted">{t(theme)}</p>
                <Section />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
