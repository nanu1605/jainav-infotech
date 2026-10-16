'use client'

import { useTranslations } from 'next-intl'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'

import { FormField } from './FormField'
import { Input } from './Input'
import { LoadFailed } from './lazy'
import { ConsentNotice } from './LeadForm'

const NewsletterFields = lazy(() =>
  import('./NewsletterFields').then(
    (m) => ({ default: m.NewsletterFields }),
    () => ({ default: LoadFailed }),
  ),
)

/**
 * Newsletter sign-up (spec §13), in the footer of every page and in CTA blocks. The form
 * (react-hook-form, Zod, Turnstile) loads as it nears the viewport, keeping it out of every
 * page's initial JavaScript (spec §15); until then a look-alike holds its place.
 */
export function NewsletterForm({ level = 2 }: { level?: 2 | 3 }) {
  const t = useTranslations('forms')
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin: '400px' },
    )
    observer.observe(ref.current!)
    return () => observer.disconnect()
  }, [])

  const Heading = `h${level}` as const
  // Inert: it is swapped for the real form, which would lose anything typed into it.
  const placeholder = (
    <fieldset disabled className="contents">
      <div className="grid gap-5">
        <FormField label={t('fields.email')} required>
          <Input type="email" autoComplete="email" />
        </FormField>
        <div className="min-h-[65px]" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <ConsentNotice kind="newsletter" className="min-w-0 flex-1 basis-64" />
          <Button>{t('newsletter.submit')}</Button>
        </div>
      </div>
    </fieldset>
  )

  return (
    <div ref={ref}>
      <Heading className="text-sm font-semibold text-fg">{t('newsletter.title')}</Heading>
      <p className="mt-1 text-sm text-fg-muted">{t('newsletter.text')}</p>
      <div className="mt-4">
        {near ? (
          <Suspense fallback={placeholder}>
            <NewsletterFields level={level === 2 ? 3 : 4} />
          </Suspense>
        ) : (
          placeholder
        )}
      </div>
    </div>
  )
}
