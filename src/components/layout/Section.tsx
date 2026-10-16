import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Container, type ContainerProps } from './Container'

export type SectionProps = Omit<ComponentProps<'section'>, 'title'> & {
  tone?: 'default' | 'subtle'
  size?: ContainerProps['size']
  eyebrow?: ReactNode
  title?: ReactNode
  intro?: ReactNode
  /** Heading level of `title`, so the page outline stays correct (h1 only for a page hero). */
  level?: 1 | 2 | 3
  align?: 'start' | 'center'
}

/** Page section with the site's vertical rhythm and an optional eyebrow / title / intro header. */
export function Section({
  tone = 'default',
  size,
  eyebrow,
  title,
  intro,
  level = 2,
  align = 'start',
  className,
  children,
  ...props
}: SectionProps) {
  const Heading = `h${level}` as const

  return (
    <section
      className={cn('py-16 sm:py-24', tone === 'subtle' && 'bg-bg-subtle', className)}
      {...props}
    >
      <Container size={size}>
        {(eyebrow || title || intro) && (
          <header
            className={cn(
              'mb-10 flex max-w-3xl flex-col items-start sm:mb-14',
              align === 'center' && 'mx-auto items-center text-center',
            )}
          >
            {eyebrow && (
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-fg-muted">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                {eyebrow}
              </p>
            )}
            {title && (
              <Heading className="font-display text-3xl leading-snug font-bold text-balance text-fg sm:text-4xl [&:not(:lang(hi))]:tracking-tight">
                {title}
              </Heading>
            )}
            {intro && <p className="mt-4 text-lg text-pretty text-fg-muted">{intro}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  )
}
