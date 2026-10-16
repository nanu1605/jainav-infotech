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

type DocNode = { id: number; slug?: string | null; parent?: number | { id: number } | null }

/**
 * Full slug path of each product doc, following `parent` (spec §7: /docs/[[...path]]).
 * Docs whose parent chain is broken or loops are left out.
 */
export function docPaths<D extends DocNode>(docs: D[]): Map<number, string[]> {
  const byId = new Map(docs.map((d) => [d.id, d]))
  const paths = new Map<number, string[]>()
  for (const doc of docs) {
    const path: string[] = []
    const seen = new Set<number>()
    let node: D | undefined = doc
    while (node && node.slug && !seen.has(node.id)) {
      seen.add(node.id)
      path.unshift(node.slug)
      const parent: DocNode['parent'] = node.parent
      if (parent == null) {
        paths.set(doc.id, path)
        break
      }
      node = byId.get(typeof parent === 'object' ? parent.id : parent)
    }
  }
  return paths
}
