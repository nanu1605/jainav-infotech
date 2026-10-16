'use client'

import { Button, useConfig } from '@payloadcms/ui'
import { useSearchParams } from 'next/navigation'

/** Downloads the leads the list shows (same filters, search and sort) as CSV. */
export function ExportLeads() {
  const { config } = useConfig()
  const searchParams = useSearchParams()
  const params = new URLSearchParams()
  for (const [key, value] of searchParams) {
    if (key === 'search' || key === 'sort' || key.startsWith('where')) params.append(key, value)
  }
  const query = params.size ? `?${params}` : ''
  return (
    <Button
      el="anchor"
      url={`${config.routes.api}/leads/export${query}`}
      buttonStyle="secondary"
      size="small"
    >
      Export CSV
    </Button>
  )
}
