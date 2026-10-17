import type { ReactNode } from 'react'

import { ClientMessages } from '@/i18n/clientMessages'

/** Account pages (spec §11.2): their client components read the `account` messages, which other pages don't ship. */
export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages extra={['account']}>{children}</ClientMessages>
}
