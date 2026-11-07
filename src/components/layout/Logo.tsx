import { useTranslations } from 'next-intl'

import { LogoMark } from './LogoMark'

/** The Jainav mark beside the name (spec Appendix B). */
export function Logo() {
  const t = useTranslations('site')

  return (
    <span className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
      <LogoMark height={28} className="h-7 w-auto shrink-0" />
      {t('name')}
    </span>
  )
}
