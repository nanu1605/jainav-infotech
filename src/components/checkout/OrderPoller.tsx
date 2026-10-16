'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useRouter } from '@/i18n/navigation'
import type { Order } from '@/payload-types'

// [interval, time limit] in milliseconds.
const TIMING = { payment: [3_000, 180_000], invoice: [5_000, 60_000] } as const

/** Whether the order has left `created` (paid, or expired meanwhile). */
async function settled(order: string) {
  try {
    const res = await fetch(`/api/v1/checkout/status?order=${encodeURIComponent(order)}`, {
      cache: 'no-store',
    })
    const data = (await res.json()) as { status?: Order['status'] }
    return !!data.status && data.status !== 'created'
  } catch {
    return false
  }
}

/**
 * Waits on the success page (spec §11.3 step 11). `payment`: polls the order's status and
 * re-renders the page once it settles. `invoice`: re-renders until the invoice PDF is ready, when
 * the page stops rendering this.
 */
export function OrderPoller({ order, waitFor }: { order: string; waitFor: 'payment' | 'invoice' }) {
  const t = useTranslations('checkout.success')
  const router = useRouter()
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    const [every, limit] = TIMING[waitFor]
    const until = Date.now() + limit
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      if (waitFor === 'invoice') router.refresh()
      else if (await settled(order)) return router.refresh()
      if (!active) return
      if (Date.now() >= until) setGaveUp(true)
      else timer = setTimeout(() => void tick(), every)
    }
    timer = setTimeout(() => void tick(), every)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [order, waitFor, router])

  if (waitFor === 'invoice') return null
  return (
    <p role="status" className="flex items-start gap-3 text-lg text-fg">
      {gaveUp ? (
        t('stillConfirming')
      ) : (
        <>
          <Spinner aria-hidden className="mt-1" />
          {t('confirming')}
        </>
      )}
    </p>
  )
}
