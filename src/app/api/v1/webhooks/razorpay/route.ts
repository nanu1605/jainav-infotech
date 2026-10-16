import { receiveWebhook } from '@/lib/commerce/webhooks'

/** POST /api/v1/webhooks/razorpay (spec §11.3 step 6). */
export const POST = receiveWebhook
