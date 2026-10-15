import { useTranslations } from 'next-intl'

/** Typographic placeholder until the real logo lands in public/brand/ (spec §5.5). */
export function Logo() {
  const t = useTranslations('site')

  return (
    <span className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span
        aria-hidden
        className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-fg"
      >
        J
      </span>
      {t('name')}
    </span>
  )
}
