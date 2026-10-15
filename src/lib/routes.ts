/**
 * Public (unprefixed, English) path of each collection that has its own page (spec §7).
 * Hindi is the same path under /hi. Shared by revalidation hooks and SEO URL generation.
 */
export const publicPath = {
  pages: (slug: string) => (slug === 'home' ? '/' : `/${slug}`),
  products: (slug: string) => `/products/${slug}`,
  services: (slug: string) => `/services/${slug}`,
  posts: (slug: string) => `/blog/${slug}`,
  jobs: (slug: string) => `/careers/${slug}`,
  'legal-pages': (slug: string) => `/legal/${slug}`,
} as const

export type RoutedCollection = keyof typeof publicPath

/** Sub-pages of a hosted product (spec §7). */
export const hostedProductSubpaths = [
  'pricing',
  'download',
  'changelog',
  'docs',
  'support',
] as const
