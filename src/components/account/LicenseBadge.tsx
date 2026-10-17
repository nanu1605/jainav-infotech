import { useTranslations } from 'next-intl'

import type { LicenseStatus } from '@/collections/Licensing'
import { Badge, type BadgeProps } from '@/components/ui/Badge'

const TONE: Record<LicenseStatus, NonNullable<BadgeProps['tone']>> = {
  active: 'success',
  suspended: 'warning',
  revoked: 'danger',
  expired: 'neutral',
}

/** License status with a dot, so it isn't told by color alone. */
export function LicenseBadge({ status }: { status: LicenseStatus }) {
  const t = useTranslations('account.licenses.status')
  return (
    <Badge tone={TONE[status]}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  )
}
