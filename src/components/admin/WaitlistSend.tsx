'use client'

import {
  Button,
  ConfirmationModal,
  toast,
  useConfig,
  useFormModified,
  useModal,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const MODAL = 'waitlist-send'
const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`

/** Test and send buttons for a draft; progress once sending has started. */
export function WaitlistSend({
  id,
  status,
  recipients,
  sent,
}: {
  id: number
  status: 'draft' | 'sending' | 'sent'
  recipients: number
  sent: number
}) {
  const { config } = useConfig()
  const { openModal } = useModal()
  const router = useRouter()
  const modified = useFormModified()
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [countFailed, setCountFailed] = useState(false)
  const base = `${config.routes.api}/waitlist-emails/${id}`

  // Who can get the saved draft now (again after each save: the product may have changed).
  useEffect(() => {
    if (status !== 'draft' || modified) return
    const controller = new AbortController()
    fetch(`${base}/recipients`, { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`recipients: ${res.status}`)
        setCount(((await res.json()) as { count: number }).count)
        setCountFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCountFailed(true)
      })
    return () => controller.abort()
  }, [base, status, modified])

  // The job sends about two a second: show its progress until it is done.
  useEffect(() => {
    if (status !== 'sending') return
    const timer = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(timer)
  }, [status, router])

  if (status !== 'draft') {
    return (
      <span>
        {status === 'sending' ? 'Sending' : 'Sent'}: {sent} of {recipients}
      </span>
    )
  }

  async function send(test: boolean) {
    setBusy(true)
    try {
      const res = await fetch(`${base}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        recipients?: number
        errors?: { message?: string }[]
      }
      if (!res.ok) {
        toast.error(body.errors?.[0]?.message ?? 'Sending failed. Try again.')
        return
      }
      toast.success(
        test
          ? 'Test sent to your email: the English and the Hindi version.'
          : `Sending to ${people(body.recipients ?? 0)}.`,
      )
      router.refresh()
    } catch {
      toast.error('Sending failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span>
        {modified
          ? 'Save your changes to send.'
          : count !== null
            ? `${people(count)} can get it.`
            : countFailed
              ? 'Couldn’t count recipients. Reload to try again.'
              : 'Counting recipients…'}
      </span>
      <Button
        buttonStyle="secondary"
        size="small"
        margin={false}
        disabled={busy || modified}
        onClick={() => void send(true)}
      >
        Send a test to me
      </Button>
      <Button
        size="small"
        margin={false}
        disabled={busy || modified || !count}
        onClick={() => openModal(MODAL)}
      >
        {count ? `Send to ${people(count)}…` : 'Send…'}
      </Button>
      <ConfirmationModal
        modalSlug={MODAL}
        heading="Send this email?"
        body={`It goes to ${people(count ?? 0)} on this waitlist now. This can’t be undone.`}
        confirmLabel="Send"
        confirmingLabel="Sending…"
        onConfirm={() => send(false)}
      />
    </div>
  )
}
