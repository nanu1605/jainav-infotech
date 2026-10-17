import { createHandler } from '@/lib/commerce/checkout'

/** POST /api/v1/checkout/create: the order and its Razorpay order (spec §11.3 step 3). */
export const POST = createHandler
