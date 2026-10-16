import type { Locale } from '@/i18n/routing'
import type { Faq, Page } from '@/payload-types'

import { FaqList } from './FaqList'
import { Hero } from './page/Hero'
import {
  CompanyFacts,
  Cta,
  Latest,
  Principles,
  Process,
  ProductShowcase,
  Proof,
  RichTextBlock,
  ServicesOverview,
  TeamBlock,
  Timeline,
} from './page/Sections'
import { docs } from './shared'

type PageBlock = NonNullable<Page['layout']>[number]

/**
 * Layout blocks of pages and services (spec §8.2). Every block renders nothing when empty.
 * Only a hero that opens the page gets the h1; `heading` supplies it otherwise.
 */
export function PageBlocks({ blocks, locale }: { blocks?: PageBlock[] | null; locale: Locale }) {
  return blocks?.map((block, i) => {
    const key = block.id ?? `${block.blockType}-${i}`
    const props = { locale }
    switch (block.blockType) {
      case 'hero':
        return <Hero key={key} {...props} block={block} level={i === 0 ? 1 : 2} />
      case 'productShowcase':
        return <ProductShowcase key={key} {...props} block={block} />
      case 'servicesOverview':
        return <ServicesOverview key={key} {...props} block={block} />
      case 'principles':
        return <Principles key={key} {...props} block={block} />
      case 'proof':
        return <Proof key={key} {...props} block={block} />
      case 'process':
        return <Process key={key} {...props} block={block} />
      case 'latest':
        return <Latest key={key} {...props} block={block} />
      case 'cta':
        return <Cta key={key} {...props} block={block} />
      case 'richText':
        return <RichTextBlock key={key} {...props} block={block} />
      case 'timeline':
        return <Timeline key={key} {...props} block={block} />
      case 'team':
        return <TeamBlock key={key} {...props} block={block} />
      case 'companyFacts':
        return <CompanyFacts key={key} {...props} block={block} />
      case 'faq':
        return <FaqList key={key} heading={block.heading} faqs={docs<Faq>(block.faqs)} />
    }
  })
}
