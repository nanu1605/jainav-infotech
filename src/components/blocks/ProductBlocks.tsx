import type { Locale } from '@/i18n/routing'
import type { Product } from '@/payload-types'
import type { LoadedProduct } from '@/lib/product'

import { ProductHero } from './product/Hero'
import {
  ChangelogPreview,
  Comparison,
  CtaBand,
  DownloadPanel,
  Embed,
  FeatureScroller,
  HowItWorks,
  IconGrid,
  Pricing,
  Privacy,
  ProblemSolution,
  ProductFaq,
  ProductRichText,
  ProductTestimonials,
  Requirements,
  Screenshots,
  StatStrip,
  Video,
} from './product/Sections'

type ProductBlock = NonNullable<Product['layout']>[number]

/**
 * A product page's blocks (spec §8.4); empty blocks render nothing. A page whose layout doesn't
 * open with a hero gets one built from the product's own fields, so it always has its h1 and
 * buttons.
 */
export function ProductBlocks({ loaded, locale }: { loaded: LoadedProduct; locale: Locale }) {
  const blocks = loaded.product.layout ?? []
  const props = { locale, loaded }
  return (
    <>
      {blocks[0]?.blockType !== 'productHero' && <ProductHero block={{}} {...props} />}
      {blocks.map((block: ProductBlock, i) => {
        const key = block.id ?? `${block.blockType}-${i}`
        switch (block.blockType) {
          case 'productHero':
            // Only the first hero is the page's hero; later ones would add a second h1.
            return i === 0 ? <ProductHero key={key} block={block} {...props} /> : null
          case 'problemSolution':
            return <ProblemSolution key={key} block={block} {...props} />
          case 'featureScroller':
            return <FeatureScroller key={key} block={block} {...props} />
          case 'featureGrid':
          case 'useCases':
            return <IconGrid key={key} block={block} {...props} />
          case 'screenshots':
            return <Screenshots key={key} block={block} {...props} />
          case 'video':
            return <Video key={key} block={block} {...props} />
          case 'howItWorks':
            return <HowItWorks key={key} block={block} {...props} />
          case 'pricing':
            return <Pricing key={key} block={block} {...props} />
          case 'privacy':
            return <Privacy key={key} block={block} {...props} />
          case 'requirements':
            return <Requirements key={key} block={block} {...props} />
          case 'download':
            return <DownloadPanel key={key} block={block} {...props} />
          case 'changelogPreview':
            return <ChangelogPreview key={key} block={block} {...props} />
          case 'faq':
            return <ProductFaq key={key} block={block} {...props} />
          case 'testimonials':
            return <ProductTestimonials key={key} block={block} {...props} />
          case 'comparison':
            return <Comparison key={key} block={block} {...props} />
          case 'ctaBand':
            return <CtaBand key={key} block={block} {...props} />
          case 'richText':
            return <ProductRichText key={key} block={block} {...props} />
          case 'statStrip':
            return <StatStrip key={key} block={block} {...props} />
          case 'embed':
            return <Embed key={key} block={block} {...props} />
        }
      })}
    </>
  )
}
