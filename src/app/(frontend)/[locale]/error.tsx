'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

/** 500 page (spec §8.15). Shown without the header: the site layout itself may have failed. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Hands a browser render error to Sentry's global handler (once it has loaded). Server errors
  // (with a digest) were already reported by instrumentation.ts.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && !error.digest) reportError(error)
  }, [error])
  const t = useTranslations('system.error')
  const locale = useLocale()
  return (
    <main id="main" className="flex min-h-dvh items-center">
      <Container size="prose" className="py-24 text-center">
        <p className="font-display text-sm font-semibold text-fg-muted tabular-nums">500</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-balance text-fg">{t('title')}</h1>
        <p className="mt-4 text-lg text-fg-muted">{t('text')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            {t('retry')}
          </Button>
          {/* A full page load, in case the client state is what broke. */}
          <Button asChild size="lg" variant="secondary">
            <a href={locale === 'en' ? '/' : `/${locale}`}>{t('home')}</a>
          </Button>
        </div>
      </Container>
    </main>
  )
}
