import { ChevronDown } from 'lucide-react'

import { JsonLd } from '@/components/content/JsonLd'
import { Section } from '@/components/layout/Section'
import type { Faq } from '@/payload-types'

/**
 * FAQ with FAQPage structured data (spec §15). Native <details>: answers stay in the server HTML
 * (Radix Accordion unmounts closed panels) and it needs no JavaScript. Nothing without questions.
 */
export function FaqList({ heading, faqs }: { heading?: string | null; faqs: Faq[] }) {
  if (!faqs.length) return null
  return (
    <Section title={heading} size="prose">
      <div className="divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <details key={faq.id} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 font-medium text-fg underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
              {faq.question}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-fg-muted transition-transform duration-(--duration-base) group-open:rotate-180"
              />
            </summary>
            <p className="pb-4 whitespace-pre-line text-fg-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }}
      />
    </Section>
  )
}
