import type { ReactNode } from 'react'

import { ClientMessages } from '@/i18n/clientMessages'

/** Checkout pages (spec §11.3): their client components read the `checkout` messages, which other pages don't ship. */
export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages extra={['checkout']}>{children}</ClientMessages>
}
