import { useTranslations } from 'next-intl'
import { Fragment, type ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import type { Navigation, SiteSetting } from '@/payload-types'

import { Container } from './Container'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'

type FooterColumn = Pick<NonNullable<Navigation['footer']>[number], 'title' | 'links'>
type Social = Pick<NonNullable<SiteSetting['socials']>[number], 'platform' | 'url'>

export type FooterProps = {
  columns: FooterColumn[]
  socials: Social[]
  legal: {
    legalName: string
    cin?: string | null
    registeredAddress?: string | null
    email?: string | null
    phone?: string | null
  }
  /** Newsletter sign-up (NewsletterForm). */
  newsletter?: ReactNode
}

/** Simplified brand marks, drawn in currentColor on a 24×24 grid. */
const SOCIALS: Record<Social['platform'], { name: string; mark: ReactNode }> = {
  linkedin: {
    name: 'LinkedIn',
    mark: (
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    ),
  },
  x: {
    name: 'X',
    mark: (
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.25 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
    ),
  },
  instagram: {
    name: 'Instagram',
    mark: (
      <>
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.25" />
        </g>
        <circle cx="17.5" cy="6.5" r="1.25" />
      </>
    ),
  },
  youtube: {
    name: 'YouTube',
    mark: (
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    ),
  },
  github: {
    name: 'GitHub',
    mark: (
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3Z" />
    ),
  },
  facebook: {
    name: 'Facebook',
    mark: (
      <path d="M9.1 23.69v-7.98H6.63v-3.67H9.1v-1.58c0-4.09 1.85-5.98 5.86-5.98.76 0 2.07.15 2.61.3v3.32c-.28-.03-.78-.04-1.39-.04-1.97 0-2.73.74-2.73 2.68v1.3h3.92l-.67 3.67h-3.25v8.25A12 12 0 1 0 9.1 23.69Z" />
    ),
  },
}

const inlineLink = 'underline-offset-4 hover:text-fg hover:underline'

/** Site footer (spec §8.1): link columns, newsletter slot, socials, language switch, legal block. */
export function Footer({ columns, socials, legal, newsletter }: FooterProps) {
  const t = useTranslations('ui.footer')

  const legalParts = [
    legal.legalName,
    legal.cin && t('cin', { cin: legal.cin }),
    legal.registeredAddress && t('registeredOffice', { address: legal.registeredAddress }),
    legal.email && (
      <a href={`mailto:${legal.email}`} className={inlineLink}>
        {legal.email}
      </a>
    ),
    legal.phone && (
      <a href={`tel:${legal.phone.replace(/[^\d+]/g, '')}`} className={inlineLink}>
        {legal.phone}
      </a>
    ),
  ].filter(Boolean)

  return (
    <footer className="@container border-t border-border bg-bg-subtle text-fg">
      {/* Bottom room so the floating WhatsApp button never covers the legal line. */}
      <Container className="pt-12 pb-24 @3xl:pt-16">
        <div className="grid gap-12 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @4xl:gap-16">
          <div className="flex flex-col items-start gap-6">
            <Link href="/" className="-ml-1 rounded-md p-1">
              <Logo />
            </Link>
            {newsletter && <div className="w-full max-w-sm">{newsletter}</div>}
          </div>

          {columns.length > 0 && (
            <nav
              aria-label={t('label')}
              className="grid grid-cols-2 gap-x-6 gap-y-10 @2xl:grid-cols-3"
            >
              {columns.map((column, i) => (
                <div key={i} className="min-w-0">
                  {column.title && (
                    <h2 className="text-sm font-semibold text-fg">{column.title}</h2>
                  )}
                  <ul className="mt-3 space-y-0.5">
                    {column.links
                      ?.filter((link) => link.label)
                      .map((link) => (
                        <li key={`${link.href}-${link.label}`}>
                          <Link
                            href={link.href}
                            className="inline-flex min-h-10 items-center py-1 text-sm text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          {socials.length > 0 && (
            <ul className="-ml-2 flex flex-wrap gap-1">
              {socials.map(({ platform, url }) => (
                <li key={platform}>
                  <a
                    href={url}
                    aria-label={t('social', { platform: SOCIALS[platform].name })}
                    title={SOCIALS[platform].name}
                    className="inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors duration-(--duration-fast) hover:bg-hover hover:text-fg"
                  >
                    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      {SOCIALS[platform].mark}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <LanguageSwitch className="-mr-2 ml-auto" />
        </div>

        <address className="mt-4 text-sm text-fg-muted not-italic">
          {legalParts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span aria-hidden className="mx-2">
                  ·
                </span>
              )}
              {part}
            </Fragment>
          ))}
        </address>
      </Container>
    </footer>
  )
}
