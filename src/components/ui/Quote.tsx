import { Quote as QuoteMark } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import type { Media } from '@/payload-types'

export type QuoteProps = Omit<ComponentProps<'figure'>, 'children'> & {
  children: ReactNode
  name: string
  role?: string | null
  company?: string | null
  /** Photo; without one the avatar shows the person's initials. */
  image?: Media | string | null
}

/** Testimonial or pull quote: the quote in a blockquote, the attribution in a figcaption. */
export function Quote({ children, name, role, company, image, className, ...props }: QuoteProps) {
  const detail = [role, company].filter(Boolean).join(', ')
  return (
    <figure className={cn('flex flex-col gap-6', className)} {...props}>
      <QuoteMark aria-hidden className="size-8 text-primary" />
      <blockquote className="font-display text-lg leading-relaxed text-fg sm:text-xl">
        {children}
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar name={name} image={image} decorative />
        <span className="min-w-0">
          <span className="block font-semibold text-fg">{name}</span>
          {detail && <span className="block text-sm text-fg-muted">{detail}</span>}
        </span>
      </figcaption>
    </figure>
  )
}
