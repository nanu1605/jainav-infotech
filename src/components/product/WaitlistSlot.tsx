import { getTranslations } from 'next-intl/server'

import { WaitlistForm } from '@/components/forms/lazy'
import { Section } from '@/components/layout/Section'

/** Target of "Join the waitlist" (#waitlist): the product's waitlist form (spec §13). */
export async function WaitlistSlot({ name, slug }: { name: string; slug: string }) {
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
      <div className="mx-auto max-w-lg">
        <WaitlistForm product={{ slug, name }} />
      </div>
    </Section>
  )
}
