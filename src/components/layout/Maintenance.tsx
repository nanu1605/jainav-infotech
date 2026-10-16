import { Wrench } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Container } from './Container'

/** Shown instead of every page while Site settings → Maintenance mode is on (spec §8.15). */
export function Maintenance() {
  const t = useTranslations('system.maintenance')
  return (
    <main id="main" className="scroll-mt-16">
      <Container size="prose" className="py-32 text-center">
        <Wrench aria-hidden className="mx-auto size-10 text-fg-subtle" />
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance">
          {t('title')}
        </h1>
        <p className="mt-4 text-lg text-fg-muted">{t('text')}</p>
      </Container>
    </main>
  )
}
