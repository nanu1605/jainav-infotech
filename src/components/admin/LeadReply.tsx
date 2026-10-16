'use client'

import { Button, useFormFields } from '@payloadcms/ui'

import { whatsappHref } from './whatsapp'

/** Sidebar shortcuts to answer a lead by email or WhatsApp. */
export function LeadReply() {
  const email = useFormFields(([fields]) => fields.email?.value)
  const phone = useFormFields(([fields]) => fields.phone?.value)
  const whatsapp = whatsappHref(phone)
  if (typeof email !== 'string' && !whatsapp) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
      {typeof email === 'string' && email && (
        <Button
          el="anchor"
          url={`mailto:${email}`}
          buttonStyle="secondary"
          size="small"
          margin={false}
        >
          Reply by email
        </Button>
      )}
      {whatsapp && (
        <Button
          el="anchor"
          url={whatsapp}
          newTab
          buttonStyle="secondary"
          size="small"
          margin={false}
        >
          WhatsApp
        </Button>
      )}
    </div>
  )
}
