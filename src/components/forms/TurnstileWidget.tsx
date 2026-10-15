'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useInView } from 'motion/react'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { useId, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

// Cloudflare's documented always-pass test key, never used in production builds.
const TEST_SITE_KEY = '1x00000000000000000000AA'
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === 'production' ? '' : TEST_SITE_KEY)

if (!SITE_KEY && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set: forms cannot pass Turnstile.')
}

export type TurnstileWidgetProps = {
  /** The token, or null when it expires or the challenge fails. */
  onToken?: (token: string | null) => void
  className?: string
}

/**
 * Cloudflare Turnstile, loaded only when the widget nears the viewport. The token is also
 * submitted with the surrounding form as `cf-turnstile-response`.
 */
export function TurnstileWidget({ onToken, className }: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '200px' })
  const { resolvedTheme } = useTheme()
  const locale = useLocale()
  const id = useId()
  const [token, setToken] = useState('')

  const update = (value: string) => {
    setToken(value)
    onToken?.(value || null)
  }

  return (
    // Reserves the widget's height so loading it doesn't shift the layout.
    <div ref={ref} className={cn('min-h-[65px]', className)}>
      <input type="hidden" name="cf-turnstile-response" value={token} />
      {inView && SITE_KEY && (
        <Turnstile
          id={id}
          siteKey={SITE_KEY}
          options={{
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
            language: locale,
            size: 'flexible',
            responseField: false,
          }}
          onSuccess={update}
          onExpire={() => update('')}
          onError={() => update('')}
        />
      )}
    </div>
  )
}
