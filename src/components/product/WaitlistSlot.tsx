import { Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'

/**
 * Target of "Join the waitlist" (#waitlist). The waitlist form arrives with the other forms in
 * Phase 4; until then visitors can write to us about the product.
 */
export async function WaitlistSlot({
  name,
  slug,
  email,
}: {
  name: string
  slug: string
  email?: string | null
}) {
  const t = await getTranslations('ui.waitlist')
  return (
    <Section
      id="waitlist"
      className="scroll-mt-28"
      tone="subtle"
      align="center"
      title={t('title', { name })}
      intro={t('text', { name })}
    >
      <div className="flex justify-center">
        <Button asChild size="lg">
          {email ? (
            <a href={`mailto:${email}?subject=${encodeURIComponent(t('subject', { name }))}`}>
              <Mail aria-hidden />
              {t('email')}
            </a>
          ) : (
            <Link href={`/contact?product=${slug}`}>{t('contact')}</Link>
          )}
        </Button>
      </div>
    </Section>
  )
}
