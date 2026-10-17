import { statusHandler } from '@/lib/commerce/checkout'

/** GET /api/v1/checkout/status?order=…: the success page's poller. */
export const GET = statusHandler

export const dynamic = 'force-dynamic'
