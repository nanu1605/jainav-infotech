'use client'

import { ArrowRight, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { Link } from '@/i18n/navigation'

const KEY = 'jv-announcement-dismissed'

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}
const readDismissed = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export type AnnouncementBarProps = {
  /** Changing the id shows the bar again to visitors who dismissed an earlier announcement. */
  id: string
  text: string
  link?: { label: string; href: string } | null
}

export function AnnouncementBar({ id, text, link }: AnnouncementBarProps) {
  const t = useTranslations('ui.announcement')
  // The server can't know; the inline script below hides the bar before first paint instead.
  const dismissedId = useSyncExternalStore(subscribe, readDismissed, () => null)
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || dismissedId === id) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // Private mode: hidden for this visit only.
    }
    setDismissed(true)
  }
  const hideIfDismissed = `try{if(localStorage.getItem(${JSON.stringify(KEY)})===${JSON.stringify(id).replace(/</g, '\\u003c')})document.currentScript.parentElement.hidden=true}catch(e){}`

  return (
    <div
      role="region"
      aria-label={t('label')}
      suppressHydrationWarning
      className="relative bg-fg text-fg-inverse [--ring:var(--fg-inverse)]"
    >
      {/* Runs from the server HTML: no flash and no layout shift for visitors who dismissed it. */}
      <script dangerouslySetInnerHTML={{ __html: hideIfDismissed }} />
      <div className="mx-auto flex min-h-10 max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-0.5 py-2 pr-12 pl-4 text-center text-sm sm:px-12">
        <p>{text}</p>
        {link && (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:no-underline"
          >
            {link.label}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
      <IconButton
        label={t('dismiss')}
        size="sm"
        onClick={dismiss}
        className="absolute top-1/2 right-1 -translate-y-1/2 text-fg-inverse hover:bg-fg-inverse/10 hover:text-fg-inverse focus-visible:outline-offset-0 sm:right-2"
      >
        <X aria-hidden />
      </IconButton>
    </div>
  )
}
