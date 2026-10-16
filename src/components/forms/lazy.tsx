'use client'

import { useTranslations } from 'next-intl'
import { lazy, Suspense, type ComponentType } from 'react'

import { Callout } from '@/components/ui/Callout'

/** In place of a form whose code didn't download (offline, or a tab older than a deploy). */
export function LoadFailed() {
  const t = useTranslations('forms')
  return <Callout tone="warning">{t('loadFailed')}</Callout>
}

/**
 * The lead forms with their code split off (spec §15 budget: react-hook-form, Zod and Turnstile
 * are ~40 KB). The server still renders the full form into the HTML; in the browser that
 * markup stays as it is, readable and typeable, until the chunk arrives and hydrates it. A
 * failed download shows a notice there instead of reaching the page's error boundary.
 */
export function deferred<P extends object>(load: () => Promise<ComponentType<P>>) {
  const Lazy = lazy(() =>
    load().then(
      (Component) => ({ default: Component }),
      () => ({ default: LoadFailed as ComponentType<P> }),
    ),
  )
  return function Deferred(props: P) {
    return (
      <Suspense>
        <Lazy {...props} />
      </Suspense>
    )
  }
}

export const ContactForm = deferred(() => import('./ContactForm').then((m) => m.ContactForm))
export const ProjectForm = deferred(() => import('./ProjectForm').then((m) => m.ProjectForm))
export const WaitlistForm = deferred(() => import('./WaitlistForm').then((m) => m.WaitlistForm))
export const CareersForm = deferred(() => import('./CareersForm').then((m) => m.CareersForm))
export const DataRequestForm = deferred(() =>
  import('./DataRequestForm').then((m) => m.DataRequestForm),
)
