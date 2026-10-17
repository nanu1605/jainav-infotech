'use client'

import { Button, ConfirmationModal, toast, useConfig, useModal } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { postAction } from './adminAction'

type Props = {
  /** The endpoint below the API route, e.g. `/licenses/12/resend-email`. */
  path: string
  label: string
  /** Toast after success. */
  done: string
  /** Asks first when set. */
  confirm?: { heading: string; body: string; label: string }
}

/** One admin action (spec §10) as a button: POST, toast, refresh. */
export function ActionButton({ path, label, done, confirm }: Props) {
  const { config } = useConfig()
  const { openModal } = useModal()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const slug = `action-${path.replace(/\W+/g, '-')}`

  const run = async () => {
    setBusy(true)
    const result = await postAction(`${config.routes.api}${path}`)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(done)
    router.refresh()
  }

  return (
    <>
      <Button
        buttonStyle="secondary"
        size="small"
        margin={false}
        disabled={busy}
        onClick={() => (confirm ? openModal(slug) : void run())}
      >
        {label}
      </Button>
      {confirm && (
        <ConfirmationModal
          modalSlug={slug}
          heading={confirm.heading}
          body={confirm.body}
          confirmLabel={confirm.label}
          onConfirm={run}
        />
      )}
    </>
  )
}
