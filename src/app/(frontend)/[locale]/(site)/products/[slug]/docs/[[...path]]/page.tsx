import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { RichText } from '@/components/content/RichText'
import { Container } from '@/components/layout/Container'
import { ProductShell } from '@/components/product/ProductShell'
import { SubpageHeader } from '@/components/product/SubpageHeader'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Doc } from '@/payload-types'
import { loadProduct, productMetadata, productParams } from '@/lib/product'
import { getDocs } from '@/lib/queries'
import { docPaths } from '@/lib/routes'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string; path?: string[] }> }

// The docs index per hosted product; individual docs render on first request, then stay cached.
export const generateStaticParams = async () =>
  (await productParams(true)).map(({ slug }) => ({ slug, path: [] }))

async function load(locale: Locale, slug: string, path: string[] = []) {
  const loaded = await loadProduct(locale, slug, true)
  const docs = await getDocs(locale, loaded.product.id)
  const paths = docPaths(docs)
  const key = path.map(decodeURIComponent).join('/')
  const doc = key ? docs.find((d) => paths.get(d.id)?.join('/') === key) : null
  if (key && !doc) notFound()
  return { loaded, docs, paths, doc }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, path } = (await params) as { locale: Locale; slug: string; path?: string[] }
  const { loaded, doc, paths } = await load(locale, slug, path)
  const t = await getTranslations({ locale, namespace: 'ui.productSubNav' })
  if (!doc) return productMetadata(loaded, locale, { path: 'docs', title: t('docs') })
  // Each doc has its own Hindi status (spec §6).
  return pageMetadata({
    locale,
    path: `/products/${slug}/docs/${paths.get(doc.id)!.join('/')}`,
    title: `${doc.title} – ${loaded.product.name} ${t('docs')}`,
    hiStatus: doc.hiStatus,
  })
}

/** Hosted product docs: a tree built from each doc's parent, then one doc per URL. */
export default async function DocsPage({ params }: Props) {
  const { locale, slug, path } = (await params) as { locale: Locale; slug: string; path?: string[] }
  setRequestLocale(locale)
  const { loaded, docs, paths, doc } = await load(locale, slug, path)
  const t = await getTranslations('ui.productPages')
  const href = (d: Doc) => `/products/${slug}/docs/${paths.get(d.id)!.join('/')}`
  const children = (parentId: number | null) =>
    docs.filter((d) => {
      const p = typeof d.parent === 'object' ? d.parent?.id : d.parent
      return paths.has(d.id) && (p ?? null) === parentId
    })

  const tree = (parentId: number | null, depth = 0) => {
    const items = children(parentId)
    if (!items.length) return null
    return (
      <ul className={depth ? 'mt-1 ms-3 border-s border-border ps-3' : 'space-y-1'}>
        {items.map((d) => (
          <li key={d.id}>
            <Link
              href={href(d)}
              aria-current={d.id === doc?.id ? 'page' : undefined}
              className="block rounded-md px-2 py-1.5 text-sm text-fg-muted hover:bg-hover hover:text-fg aria-[current=page]:bg-hover aria-[current=page]:font-semibold aria-[current=page]:text-fg"
            >
              {d.title}
            </Link>
            {tree(d.id, depth + 1)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ProductShell loaded={loaded} active="docs">
      <SubpageHeader
        loaded={loaded}
        locale={locale}
        page="docs"
        doc={doc ? { label: doc.title ?? '', href: href(doc) } : undefined}
      />
      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {docs.length ? (
          <>
            <nav aria-label={t('docsNav')} className="lg:sticky lg:top-32 lg:self-start">
              {tree(null)}
            </nav>
            <div>
              {doc ? (
                <RichText data={doc.body} locale={locale} />
              ) : (
                <p className="text-lg text-fg-muted">
                  {t('docsIntro', { name: loaded.product.name })}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-lg text-fg-muted lg:col-span-2">{t('noDocs')}</p>
        )}
      </Container>
    </ProductShell>
  )
}
