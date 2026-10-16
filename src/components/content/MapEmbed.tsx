'use client'

import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'

// Keeps keyboard focus on the map that replaced the button (a stable ref runs once).
const focusOnMount = (el: HTMLIFrameElement | null) => el?.focus()

/**
 * Office map that loads only when asked for (spec §8.9): no third-party request, cookie or
 * script until the visitor clicks. Google's keyless embed by address.
 */
export function MapEmbed({ address }: { address: string }) {
  const t = useTranslations('contact')
  const [open, setOpen] = useState(false)
  const query = encodeURIComponent(address.replace(/\s+/g, ' '))

  if (!open) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-xl border border-border bg-bg-subtle p-6 text-center">
        <MapPin aria-hidden className="size-8 text-fg-subtle" />
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t('showMap')}
        </Button>
        <p className="max-w-sm text-xs text-fg-muted">{t('mapNote')}</p>
      </div>
    )
  }
  return (
    <iframe
      ref={focusOnMount}
      title={t('mapTitle')}
      src={`https://www.google.com/maps?q=${query}&output=embed`}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      className="aspect-video w-full rounded-xl border border-border"
    />
  )
}
