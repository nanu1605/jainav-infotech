'use client'

import { useTranslations } from 'next-intl'

import { deferred } from '@/components/deferred'
import { Callout } from '@/components/ui/Callout'

/** In place of a form whose code didn't download (offline, or a tab older than a deploy). */
export function LoadFailed() {
  const t = useTranslations('forms')
  return <Callout tone="warning">{t('loadFailed')}</Callout>
}

// The lead forms with their code split off: react-hook-form, Zod and Turnstile are ~40 KB.
export const ContactForm = deferred(
  () => import('./ContactForm').then((m) => m.ContactForm),
  LoadFailed,
)
export const ProjectForm = deferred(
  () => import('./ProjectForm').then((m) => m.ProjectForm),
  LoadFailed,
)
export const WaitlistForm = deferred(
  () => import('./WaitlistForm').then((m) => m.WaitlistForm),
  LoadFailed,
)
export const CareersForm = deferred(
  () => import('./CareersForm').then((m) => m.CareersForm),
  LoadFailed,
)
export const DataRequestForm = deferred(
  () => import('./DataRequestForm').then((m) => m.DataRequestForm),
  LoadFailed,
)
