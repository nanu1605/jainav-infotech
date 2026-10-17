import { quoteHandler } from '@/lib/commerce/checkout'

/** POST /api/v1/checkout/quote: the price breakdown for the checkout form (spec §11.3). */
export const POST = quoteHandler
