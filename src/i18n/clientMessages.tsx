import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import type { ReactNode } from 'react'

/**
 * Namespaces client components read. Everything else stays on the server, so page text isn't
 * shipped twice in every page's payload. A client component using another namespace needs it
 * here, or (if only a few routes use it) a ClientMessages wrapper in those routes' layout.
 */
const CLIENT_MESSAGES = ['site', 'language', 'theme', 'ui', 'contact', 'system', 'forms']

/** The client messages, plus `extra` namespaces for the routes inside (account, checkout). */
export async function ClientMessages({
  extra = [],
  children,
}: {
  extra?: string[]
  children: ReactNode
}) {
  const messages = await getMessages()
  const keys = [...CLIENT_MESSAGES, ...extra]
  return (
    <NextIntlClientProvider messages={Object.fromEntries(keys.map((key) => [key, messages[key]]))}>
      {children}
    </NextIntlClientProvider>
  )
}
