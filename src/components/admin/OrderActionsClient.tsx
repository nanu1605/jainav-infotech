'use client'

import {
  Banner,
  Button,
  ConfirmationModal,
  Drawer,
  TextareaInput,
  TextInput,
  toast,
  useConfig,
  useModal,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useState } from 'react'

import { formatINR } from '@/lib/format'

import { postAction, toPaise } from './adminAction'

type Props = {
  orderId: number
  orderNumber: string
  /** Paise, like every amount here. */
  total: number
  refunded: number
  refundable: number
  pending: { refundId: string; amount: number; at: string }[]
  duplicates: { paymentId: string; refunded: number; pending: number; left: number }[]
}

const inr = (paise: number) => formatINR('en', paise)
const DRAWER = 'order-refunds'
const CONFIRM = 'order-refund-confirm'
const CONFIRM_DUPLICATE = 'order-refund-duplicate'
const gap = { display: 'grid', gap: 'calc(var(--base) / 2)' } as const

/**
 * Refunds in a drawer: an amount in rupees ("Full refund" fills in what is left) and a reason, then
 * a confirmation; one click (and a confirmation) per duplicate payment. Razorpay's webhook does
 * the rest, so the order shows the request as pending until it arrives.
 */
export function OrderActionsClient({
  orderId,
  orderNumber,
  total,
  refunded,
  refundable,
  pending,
  duplicates,
}: Props) {
  const { config } = useConfig()
  const { openModal, closeModal } = useModal()
  const router = useRouter()
  const [rupees, setRupees] = useState('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState('')
  const [duplicate, setDuplicate] = useState<string | null>(null)
  const amount = toPaise(rupees) ?? 0
  const url = `${config.routes.api}/orders/${orderId}/refund`

  const review = () => {
    const issue =
      toPaise(rupees) === null || amount < 100
        ? 'Enter the amount in rupees, at least ₹1: for example 499 or 499.50.'
        : amount > refundable
          ? `At most ${inr(refundable)} can be refunded.`
          : reason.trim().length < 3
            ? 'Give a reason for the refund (at least 3 characters).'
            : ''
    setProblem(issue)
    if (!issue) openModal(CONFIRM)
  }

  const send = async (body: object, done: string) => {
    const result = await postAction(url, body)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(done)
    closeModal(DRAWER)
    setRupees('')
    setReason('')
    router.refresh()
  }

  const waiting =
    ' The order, its credit note and the customer’s email follow when Razorpay confirms it.'
  return (
    <>
      <Button buttonStyle="secondary" size="small" margin={false} onClick={() => openModal(DRAWER)}>
        Refund…
      </Button>
      <Drawer slug={DRAWER} title={`Refunds for order ${orderNumber}`}>
        <div style={{ ...gap, gap: 'var(--base)', maxWidth: '40rem' }}>
          <p>
            Paid {inr(total)}. Refunded so far: {inr(refunded)}. Can be refunded now:{' '}
            {inr(refundable)}.
          </p>
          {pending.length > 0 && (
            <Banner type="info">
              Waiting for Razorpay to confirm:{' '}
              {pending.map((p) => `${inr(p.amount)} (${p.refundId})`).join(', ')}.{waiting}
            </Banner>
          )}
          {refundable >= 100 && (
            <div style={gap}>
              <TextInput
                path="refundAmount"
                label="Amount in rupees"
                required
                value={rupees}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRupees(e.target.value)}
              />
              <div>
                <Button
                  buttonStyle="secondary"
                  size="small"
                  margin={false}
                  onClick={() => setRupees((refundable / 100).toFixed(2))}
                >
                  Full refund ({inr(refundable)})
                </Button>
              </div>
              <TextareaInput
                path="refundReason"
                label="Reason (kept in the order’s history; Razorpay gets only the order number)"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div role="alert">{problem && <Banner type="error">{problem}</Banner>}</div>
              <div>
                <Button margin={false} onClick={review}>
                  Review refund
                </Button>
              </div>
            </div>
          )}
          {duplicates.length > 0 && (
            <section style={gap}>
              <h3>Duplicate payments</h3>
              <p>
                This order was paid twice. Refund each extra payment in full: the order, its invoice
                and its license stay as they are.
              </p>
              <ul style={{ ...gap, margin: 0, paddingLeft: 'var(--base)' }}>
                {duplicates.map((d) => (
                  <li key={d.paymentId}>
                    <code>{d.paymentId}</code>:{' '}
                    {d.left >= 100 && !d.pending
                      ? `${inr(d.left)} to refund `
                      : d.pending
                        ? `${inr(d.pending)} refund requested`
                        : `refunded (${inr(d.refunded)})`}
                    {d.left >= 100 && !d.pending && (
                      <Button
                        buttonStyle="secondary"
                        size="small"
                        margin={false}
                        onClick={() => {
                          setDuplicate(d.paymentId)
                          openModal(CONFIRM_DUPLICATE)
                        }}
                      >
                        Refund duplicate
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <ConfirmationModal
          modalSlug={CONFIRM}
          heading={`Refund ${inr(amount)}?`}
          body={`Razorpay refunds ${inr(amount)} of order ${orderNumber} to the customer. A refund can’t be undone.`}
          confirmLabel="Refund"
          confirmingLabel="Refunding…"
          onConfirm={() =>
            send({ amount, reason: reason.trim() }, `Refund of ${inr(amount)} requested.${waiting}`)
          }
        />
        <ConfirmationModal
          modalSlug={CONFIRM_DUPLICATE}
          heading="Refund the duplicate payment?"
          body={`Razorpay refunds payment ${duplicate ?? ''} in full to the customer. The order stays paid.`}
          confirmLabel="Refund duplicate"
          confirmingLabel="Refunding…"
          onConfirm={() =>
            duplicate
              ? send(
                  { paymentId: duplicate, reason: 'Duplicate payment' },
                  'Duplicate payment refund requested.',
                )
              : undefined
          }
        />
      </Drawer>
    </>
  )
}
