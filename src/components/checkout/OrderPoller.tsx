'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useRouter } from '@/i18n/navigation'
import type { Order } from '@/payload-types'

const EVERY = 3_000
const LIMIT = 180_000

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
 * Waits on the success page (spec §11.3 step 11): polls the order's status and re-renders the
 * page once it settles (a late capture comes through the webhook or reconciliation).
 */
export function OrderPoller({ order }: { order: string }) {
  const t = useTranslations('checkout.success')
  const router = useRouter()
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    const until = Date.now() + LIMIT
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      if (await settled(order)) return router.refresh()
      if (!active) return
      if (Date.now() >= until) setGaveUp(true)
      else timer = setTimeout(() => void tick(), EVERY)
    }
    timer = setTimeout(() => void tick(), EVERY)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [order, router])

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
