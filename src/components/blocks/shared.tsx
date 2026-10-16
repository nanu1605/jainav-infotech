import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'

export type BlockProps<B> = { block: B; locale: Locale }

/** Populated relationship → object. Unreadable ones (unpublished, no access) stay ids: drop them. */
export const docs = <T extends object>(items: (number | T)[] | null | undefined): T[] =>
  (items ?? []).filter((item): item is T => typeof item === 'object' && item !== null)

export const media = (value: number | Media | null | undefined): Media | null =>
  typeof value === 'object' && value?.url ? value : null

const isExternal = (href: string) => /^https?:\/\//.test(href)

type CmsLink = { label?: string | null; href?: string | null } | null | undefined

/** A labelled CMS link as a button; skipped unless both label and href are set. */
export function LinkButton({
  link,
  variant = 'primary',
  magnetic = false,
}: {
  link: CmsLink
  variant?: 'primary' | 'secondary'
  magnetic?: boolean
}) {
  if (!link?.label || !link.href) return null
  const Comp = magnetic ? MagneticButton : Button
  const content = (
    <>
      {link.label}
      {variant === 'primary' && <ArrowRight aria-hidden />}
    </>
  )
  return (
    <Comp asChild size="lg" variant={variant}>
      {isExternal(link.href) ? (
        <a href={link.href} target="_blank" rel="noopener">
          {content}
        </a>
      ) : (
        <Link href={link.href}>{content}</Link>
      )}
    </Comp>
  )
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}
