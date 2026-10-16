import { Container } from '@/components/layout/Container'
import { GradientMesh } from '@/components/motion/GradientMesh'
import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'
import type { PageHeroBlock } from '@/payload-types'

import { ButtonRow, LinkButton, type BlockProps } from '../shared'

/**
 * Page hero (spec §8.2): headline, subheadline, two buttons and routing chips over the animated,
 * pointer-reactive gradient mesh (spec §14); the server HTML already paints its still frame.
 */
export function Hero({ block, level = 1 }: BlockProps<PageHeroBlock> & { level?: 1 | 2 }) {
  const { headline, subheadline, primary, secondary, chips } = block
  const Heading = `h${level}` as const
  return (
    <section className="relative isolate overflow-hidden">
      <GradientMesh />
      <Container className="py-20 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <Heading className="font-display text-4xl leading-tight font-bold text-balance text-fg sm:text-6xl [&:not(:lang(hi))]:tracking-tight">
            {headline}
          </Heading>
          {subheadline && (
            <p className="mt-6 max-w-2xl text-lg text-pretty text-fg-muted sm:text-xl">
              {subheadline}
            </p>
          )}
          {(primary?.label || secondary?.label) && (
            <div className="mt-10">
              <ButtonRow>
                <LinkButton link={primary} magnetic />
                <LinkButton link={secondary} variant="secondary" />
              </ButtonRow>
            </div>
          )}
          {!!chips?.length && (
            <ul className="mt-10 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.id ?? chip.href}>
                  <Tag asChild>
                    <Link href={chip.href} data-umami-event="chip_click">
                      {chip.label}
                    </Link>
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  )
}
