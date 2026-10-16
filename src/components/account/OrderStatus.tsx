import { useTranslations } from 'next-intl'

import { Badge, type BadgeProps } from '@/components/ui/Badge'
import type { Order } from '@/payload-types'

const TONE: Record<Order['status'], NonNullable<BadgeProps['tone']>> = {
  created: 'neutral',
  expired: 'neutral',
  paid: 'success',
  refunded: 'neutral',
  'partially-refunded': 'warning',
  disputed: 'danger',
}

/** Order status with a dot, so it isn't told by color alone. */
export function OrderStatus({ status }: { status: Order['status'] }) {
  const t = useTranslations('account.status')
  return (
    <Badge tone={TONE[status]}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  )
}
