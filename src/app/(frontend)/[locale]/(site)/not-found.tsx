import { getLocale, getTranslations } from 'next-intl/server'

import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getProducts } from '@/lib/queries'

/** 404 inside the site layout, with a way back and the products (spec §8.15). */
export default async function NotFound() {
  const locale = (await getLocale()) as Locale
  const [t, products] = await Promise.all([
    getTranslations('system.notFound'),
    getProducts(locale, { retired: false }),
  ])
  return (
    <main id="main" className="scroll-mt-16">
      <Container className="py-24 sm:py-32">
        <p className="font-display text-sm font-semibold text-fg-muted tabular-nums">404</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl font-bold text-balance text-fg sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-muted">{t('text')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/">{t('home')}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/contact">{t('contact')}</Link>
          </Button>
        </div>
        {products.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-semibold text-fg">{t('products')}</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </main>
  )
}
