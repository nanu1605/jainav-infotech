import { verifyHandler } from '@/lib/commerce/checkout'

/** POST /api/v1/checkout/verify: Checkout's success callback (spec §11.3 step 5). */
export const POST = verifyHandler
