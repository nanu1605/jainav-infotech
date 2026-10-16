import { jsonLd } from '@/lib/seo'

/** Structured data for search engines (spec §15). */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
}
