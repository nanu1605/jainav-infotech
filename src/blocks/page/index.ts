import type { Block } from 'payload'

import { CompanyFacts } from './companyFacts'
import { Cta } from './cta'
import { Faq } from './faq'
import { Hero } from './hero'
import { Latest } from './latest'
import { Principles } from './principles'
import { Process } from './process'
import { ProductShowcase } from './productShowcase'
import { Proof } from './proof'
import { RichText } from './richText'
import { ServicesOverview } from './servicesOverview'
import { Team } from './team'
import { Timeline } from './timeline'

/** Layout blocks for pages and services (spec §8.2, §8.7, §8.8), in admin picker order. */
export const pageBlocks: Block[] = [
  Hero,
  ProductShowcase,
  ServicesOverview,
  Principles,
  Proof,
  Process,
  Latest,
  Cta,
  RichText,
  Timeline,
  Team,
  CompanyFacts,
  Faq,
]
