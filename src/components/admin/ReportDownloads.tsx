'use client'

import { Button, useConfig } from '@payloadcms/ui'
import { useState } from 'react'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** Month picker and CSV downloads; `ca` is decided on the server (Owner only). */
export function ReportDownloads({ defaultMonth, ca }: { defaultMonth: string; ca: boolean }) {
  const { config } = useConfig()
  const [month, setMonth] = useState(defaultMonth)
  const valid = MONTH.test(month)
  const url = (name: string) => `${config.routes.api}/reports/${name}?month=${month}`
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
      <label style={{ display: 'grid', gap: 4 }}>
        Month
        <input
          type="month"
          value={month}
          required
          onChange={(event) => setMonth(event.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s)',
            background: 'var(--theme-input-bg)',
            color: 'var(--theme-text)',
            font: 'inherit',
          }}
        />
      </label>
      {ca && (
        <Button el="anchor" url={url('ca')} disabled={!valid} margin={false}>
          CA report (CSV)
        </Button>
      )}
      <Button
        el="anchor"
        url={url('leads')}
        disabled={!valid}
        buttonStyle="secondary"
        margin={false}
      >
        Leads report (CSV)
      </Button>
    </div>
  )
}
