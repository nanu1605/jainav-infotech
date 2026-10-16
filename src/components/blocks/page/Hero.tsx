import { Pause, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Tracked } from '@/components/Tracked'
import { Container } from '@/components/layout/Container'
import { GradientMesh } from '@/components/motion/GradientMesh'
import { iconButtonVariants } from '@/components/ui/IconButton'
import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { PageHeroBlock } from '@/payload-types'

import { ButtonRow, LinkButton, type BlockProps } from '../shared'

/**
 * Page hero (spec §8.2): headline, subheadline, two buttons and routing chips over the animated,
 * pointer-reactive gradient mesh (spec §14); the server HTML already paints its still frame. The
 * corner toggle stops the drift (WCAG 2.2.2), CSS only like Marquee's; hidden with reduced motion.
 */
export function Hero({ block, level = 1 }: BlockProps<PageHeroBlock> & { level?: 1 | 2 }) {
  const { headline, subheadline, primary, secondary, chips } = block
  const Heading = `h${level}` as const
  const t = useTranslations('ui.mesh')
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
                  <Tracked event="chip_click">
                    <Tag asChild>
                      <Link href={chip.href}>{chip.label}</Link>
                    </Tag>
                  </Tracked>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
      <label
        data-mesh-pause
        className={cn(
          iconButtonVariants({ variant: 'ghost', size: 'md' }),
          'absolute end-2 bottom-2 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring motion-reduce:hidden sm:end-4 sm:bottom-4',
        )}
      >
        <input type="checkbox" aria-label={t('pause')} className="peer sr-only" />
        <Pause aria-hidden className="peer-checked:hidden" />
        <Play aria-hidden className="hidden peer-checked:block" />
      </label>
    </section>
  )
}
