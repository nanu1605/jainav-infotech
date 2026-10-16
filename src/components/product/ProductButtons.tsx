import { ArrowUpRight, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { MagneticButton } from '@/components/motion/MagneticButton'
import { Tracked } from '@/components/Tracked'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatBytes } from '@/lib/format'
import type { ResolvedButton } from '@/lib/productButtons'

type Props = { buttons: ResolvedButton[]; name: string; slug: string; locale: Locale }

/** A product's primary (magnetic) and secondary buttons, resolved per spec §8.5. */
export function ProductButtons({ buttons, name, slug, locale }: Props) {
  const t = useTranslations('ui.productButton')
  // Hero and CTA band both render these buttons: ids must differ between them.
  const uid = useId()
  if (!buttons.length) return null

  return (
    <div lang={locale} className="flex flex-wrap items-start gap-3">
      {buttons.map((b, i) => {
        const variant = i === 0 ? 'primary' : 'secondary'
        const Comp = i === 0 ? MagneticButton : Button
        const track = { product: slug, type: b.kind }
        switch (b.kind) {
          case 'visit':
          case 'demo':
            return (
              <Tracked key={b.href} event="cta_click" data={track}>
                <Comp asChild size="lg" variant={variant}>
                  <a href={b.href} target="_blank" rel="noopener">
                    {b.label ?? (b.kind === 'visit' ? t('visit', { name }) : t('demo'))}
                    <ArrowUpRight aria-hidden />
                    <span className="sr-only">{t('newTab')}</span>
                  </a>
                </Comp>
              </Tracked>
            )
          case 'download':
            return (
              <div key={b.href} className="flex flex-col items-start gap-1.5">
                {/* A plain link: the endpoint redirects to the installer file. */}
                <Tracked event="cta_click" data={track}>
                  <Comp asChild size="lg" variant={variant}>
                    <a href={b.href}>
                      <Download aria-hidden />
                      {b.label ?? t('download')}
                    </a>
                  </Comp>
                </Tracked>
                <p className="text-xs text-fg-muted tabular-nums">
                  {t('version', { version: b.version })}
                  {b.sizeBytes ? ` · ${formatBytes(locale, b.sizeBytes)}` : ''}
                </p>
              </div>
            )
          case 'buy':
            return b.disabled ? (
              <div key={b.href} className="flex flex-col items-start gap-1.5">
                <Button size="lg" variant={variant} aria-disabled aria-describedby={`${uid}-${i}`}>
                  {b.label ?? t('buy', { plan: b.plan ?? name })}
                </Button>
                <p id={`${uid}-${i}`} className="text-xs text-fg-muted">
                  {t('soon')}
                </p>
              </div>
            ) : (
              <Tracked key={b.href} event="cta_click" data={track}>
                <Comp asChild size="lg" variant={variant}>
                  <Link href={b.href}>{b.label ?? t('buy', { plan: b.plan ?? name })}</Link>
                </Comp>
              </Tracked>
            )
          case 'waitlist':
          case 'contact':
            return (
              <Tracked key={b.href} event="cta_click" data={track}>
                <Comp asChild size="lg" variant={variant}>
                  <Link href={b.href}>
                    {b.label ?? (b.kind === 'waitlist' ? t('waitlist') : t('contact'))}
                  </Link>
                </Comp>
              </Tracked>
            )
        }
      })}
    </div>
  )
}
