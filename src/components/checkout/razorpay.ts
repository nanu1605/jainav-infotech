import type * as z from 'zod/mini'

import type { CheckoutOptions, verifySchema } from '@/lib/commerce/schemas'

/** What Razorpay Checkout passes to `handler` after a successful payment (spec §11.3 step 4). */
export type RazorpaySuccess = z.input<typeof verifySchema>

/**
 * The part of Razorpay Checkout's browser API this site uses. The development stand-in gateway
 * implements the same surface, so nothing else may be called.
 */
export type RazorpayOptions = Omit<CheckoutOptions, 'script'> & {
  theme: { color: string }
  handler: (response: RazorpaySuccess) => void
  modal: { ondismiss: () => void }
}

type RazorpayCheckout = {
  open: () => void
  on: (event: 'payment.failed', callback: () => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout
  }
}

let loading: Promise<void> | undefined

/** Loads the checkout script once; a failed load can be retried. */
export function loadRazorpay(src: string): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      loading = undefined
      reject(new Error('Razorpay Checkout did not load'))
    }
    document.head.append(script)
  })
  return loading
}
