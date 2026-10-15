import type { Block } from 'payload'

import { ChangelogPreview } from './changelogPreview'
import { Comparison } from './comparison'
import { CtaBand } from './ctaBand'
import { Download } from './download'
import { Embed } from './embed'
import { Faq } from './faq'
import { FeatureGrid } from './featureGrid'
import { FeatureScroller } from './featureScroller'
import { HowItWorks } from './howItWorks'
import { Pricing } from './pricing'
import { Privacy } from './privacy'
import { ProblemSolution } from './problemSolution'
import { ProductHero } from './productHero'
import { Requirements } from './requirements'
import { RichText } from './richText'
import { Screenshots } from './screenshots'
import { StatStrip } from './statStrip'
import { Testimonials } from './testimonials'
import { UseCases } from './useCases'
import { Video } from './video'

/** Product page blocks (spec §8.4), in admin picker order. All optional; empty blocks render nothing. */
export const productBlocks: Block[] = [
  ProductHero,
  ProblemSolution,
  FeatureScroller,
  FeatureGrid,
  Screenshots,
  Video,
  HowItWorks,
  UseCases,
  Pricing,
  Privacy,
  Requirements,
  Download,
  ChangelogPreview,
  Faq,
  Testimonials,
  Comparison,
  CtaBand,
  RichText,
  StatStrip,
  Embed,
]
