import { useLocale } from 'next-intl'

import { ProductCard, type ProductCardData } from '@/components/product/ProductCard'
import type { Locale } from '@/i18n/routing'
import { accentVars } from '@/lib/accent'
import type { Media } from '@/payload-types'

// The seeded products (spec Appendix A) are the demo data, so the placeholder accent colors
// have one source and no color literal lands in src/.
import { products as seeded } from '../../../../../../scripts/seed/content'

const seedProduct = (slug: string, locale: Locale): ProductCardData => {
  const { en, hi } = seeded.find((p) => p.en.slug === slug)!
  return {
    name: en.name,
    slug: en.slug,
    tagline: locale === 'hi' && typeof hi.tagline === 'string' ? hi.tagline : en.tagline,
    status: en.status,
    platforms: en.platforms,
    accentColor: en.accentColor,
  }
}

/** A stand-in logo drawn from the product's accent, until real logos are uploaded. */
const demoLogo = (accent: string): Media => {
  const fg = accentVars(accent)['--product-accent-fg']
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="${accent}"/><path d="M14 15l10 19 10-19" fill="none" stroke="${fg}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return {
    id: 0,
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    alt: '',
    width: 48,
    height: 48,
    updatedAt: '',
    createdAt: '',
  }
}

// Sample content for the edge cases: long Hindi, every platform, an accent that isn't valid
// (falls back to the brand accent) and a product without a tagline.
const longTagline = {
  en: 'Billing, inventory and customer records for small shops in one place. Works offline, and your data stays on your computer.',
  hi: 'छोटी दुकानों के लिए बिलिंग, इन्वेंटरी और ग्राहकों का रिकॉर्ड एक ही जगह। इंटरनेट के बिना भी चलता है, और आपका डेटा आपके कंप्यूटर पर ही रहता है।',
}

export default function ProductSection() {
  const locale = useLocale() as Locale
  const vyro = seedProduct('vyro', locale)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ProductCard product={seedProduct('menumesh', locale)} />
      <ProductCard product={{ ...vyro, logo: demoLogo(vyro.accentColor) }} />
      <ProductCard product={seedProduct('baby', locale)} />
      <ProductCard
        product={{
          name: 'Sample app',
          slug: 'styleguide-long',
          tagline: longTagline[locale],
          status: 'retired',
          platforms: ['windows', 'macos', 'linux', 'web', 'android', 'ios'],
          accentColor: 'not-a-color',
        }}
        href="/products"
      />
      <ProductCard
        product={{
          name: 'Untitled',
          slug: 'styleguide-empty',
          tagline: null,
          status: 'beta',
          platforms: null,
          accentColor: vyro.accentColor,
        }}
        href="/products"
      />
    </div>
  )
}
