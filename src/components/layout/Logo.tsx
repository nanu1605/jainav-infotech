import Image from 'next/image'
import { useTranslations } from 'next-intl'

/**
 * The Jainav mark beside the name (spec Appendix B). The mark ships as two files, black for
 * light surfaces and white for dark ones; CSS shows the one for the current theme, and the
 * hidden one is never fetched because a lazy image that isn't rendered doesn't load.
 */
export function Logo() {
  const t = useTranslations('site')

  return (
    <span className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
      <Image
        src="/brand/logo-mark-light.png"
        alt=""
        width={30}
        height={28}
        className="h-7 w-auto shrink-0 dark:hidden"
      />
      <Image
        src="/brand/logo-mark-dark.png"
        alt=""
        width={30}
        height={28}
        className="hidden h-7 w-auto shrink-0 dark:block"
      />
      {t('name')}
    </span>
  )
}
