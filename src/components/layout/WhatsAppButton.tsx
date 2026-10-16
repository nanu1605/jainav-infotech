'use client'

import { MessageCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { usePathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { absoluteUrl } from '@/lib/seo'

/**
 * Floating WhatsApp chat (spec §8.1), prefilled with the page being read. Below the header,
 * menus and dialogs (z-30). It moves up while the language suggestion floats in the same corner:
 * the site layout renders the suggestion in a `data-language-suggestion` wrapper just before it.
 */
export function WhatsAppButton({ number }: { number: string }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const url = absoluteUrl(locale, usePathname())
  const text = encodeURIComponent(t('forms.whatsapp.prefill', { url }))
  return (
    // A landmark of its own: it floats outside the page regions (axe "region").
    <aside
      aria-label={t('forms.whatsapp.label')}
      className="fixed end-4 bottom-4 z-30 transition-[bottom] duration-(--duration-base) ease-out sm:end-6 sm:bottom-6 print:hidden [[data-language-suggestion]:not(:empty)~&]:bottom-20 sm:[[data-language-suggestion]:not(:empty)~&]:bottom-24"
    >
      <a
        href={`https://wa.me/${number}?text=${text}`}
        target="_blank"
        rel="noopener"
        title={t('forms.whatsapp.label')}
        className="flex size-14 items-center justify-center rounded-full bg-success text-success-fg shadow-lg transition-shadow duration-(--duration-base) ease-out hover:shadow-md"
      >
        <MessageCircle aria-hidden className="size-7" />
        <span className="sr-only">
          {t('forms.whatsapp.label')} {t('contact.newTab')}
        </span>
      </a>
    </aside>
  )
}
