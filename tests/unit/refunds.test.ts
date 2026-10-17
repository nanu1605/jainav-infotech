import { describe, expect, it } from 'vitest'

import { toPaise } from '@/components/admin/adminAction'
import { duplicateRefundEmail, licenseStatusEmail, refundEmail } from '@/emails'
import { refundState } from '@/lib/commerce/refundState'

describe('refund amounts in the admin (spec §11.6)', () => {
  it('reads rupees with up to two decimals as whole paise, without floating point', () => {
    expect(toPaise('499')).toBe(49_900)
    expect(toPaise(' 499.5 ')).toBe(49_950)
    expect(toPaise('0.29')).toBe(29)
    expect(toPaise('1,00,000.07')).toBe(10_000_007)
    for (const bad of ['', '4.999', '-5', '1e3', '₹5', 'abc', '.5']) expect(toPaise(bad)).toBeNull()
  })
})

describe('refundState (spec §11.6)', () => {
  const at = '2026-10-17T00:00:00.000Z'
  const order = (events: object[], amountRefunded = 0) => ({
    total: 99_900,
    amountRefunded,
    razorpayPaymentId: 'pay_main',
    events: events.map((e) => ({ at, ...e })),
  })

  it('subtracts refunds still waiting for Razorpay, until they are processed or fail', () => {
    const asked = {
      type: 'refund-requested',
      paymentId: 'pay_main',
      refundId: 'rfnd_a',
      amount: 30_000,
    }
    expect(refundState(order([asked]))).toMatchObject({
      refundable: 69_900,
      pending: [{ refundId: 'rfnd_a', amount: 30_000 }],
    })
    const processed = { type: 'refund-processed', refundId: 'rfnd_a', amount: 30_000 }
    expect(refundState(order([asked, processed], 30_000))).toMatchObject({
      refundable: 69_900,
      pending: [],
    })
    const failed = { type: 'refund.failed', refundId: 'rfnd_a' }
    expect(refundState(order([asked, failed]))).toMatchObject({ refundable: 99_900, pending: [] })
  })

  it('lists each duplicate payment once, with what was refunded or asked for', () => {
    const state = refundState(
      order([
        { type: 'paid-twice', paymentId: 'pay_b' },
        { type: 'paid-twice', paymentId: 'pay_c' },
        { type: 'refund-requested', paymentId: 'pay_b', refundId: 'rfnd_b', amount: 99_900 },
        { type: 'duplicate-refunded', paymentId: 'pay_b', refundId: 'rfnd_b', amount: 99_900 },
        { type: 'refund-requested', paymentId: 'pay_c', refundId: 'rfnd_c', amount: 99_900 },
      ]),
    )
    expect(state.duplicates).toEqual([
      { paymentId: 'pay_b', refunded: 99_900, pending: 0 },
      { paymentId: 'pay_c', refunded: 0, pending: 99_900 },
    ])
    // Duplicates never count against the order's own payment.
    expect(state.refundable).toBe(99_900)
  })
})

describe('refund and license status emails (spec §11.7)', () => {
  it.each(['en', 'hi'] as const)('renders every message in %s', async (locale) => {
    const emails = await Promise.all([
      refundEmail({
        locale,
        orderNumber: 'JO-ABCD2345',
        amount: 40_000,
        refunded: 40_000,
        creditNoteNumber: 'JC/26-27/00001',
        full: true,
        productName: 'VYRO',
        accountUrl: 'https://example.test/account/orders',
      }),
      duplicateRefundEmail({
        locale,
        orderNumber: 'JO-ABCD2345',
        amount: 99_900,
        accountUrl: 'https://example.test/account/orders',
      }),
      licenseStatusEmail({
        locale,
        status: 'suspended',
        productName: 'VYRO',
        licensesUrl: 'https://example.test/account/licenses',
      }),
      licenseStatusEmail({
        locale,
        status: 'revoked',
        productName: 'VYRO',
        licensesUrl: 'https://example.test/account/licenses',
      }),
    ])
    for (const email of emails) {
      expect(email.html).toContain(`lang="${locale}"`)
      // A missing message would show its key.
      expect(email.text).not.toMatch(/\b(refund|duplicateRefund|licenseStatus)\.\w+/)
    }
    expect(emails[0]!.subject).toContain('JO-ABCD2345')
    expect(emails[0]!.text).toContain('₹400')
    expect(emails[0]!.text).toContain('JC/26-27/00001')
    expect(emails[1]!.text).toContain('₹999')
    expect(emails[2]!.subject).toContain('VYRO')
  })

  it.each([
    ['en', 'in full: ₹999.', 'remaining ₹599 of your order JO-ABCD2345', 'in full (₹999)'],
    ['hi', 'पूरा रिफ़ंड कर दिया है: ₹999।', 'के बाक़ी ₹599 भी रिफ़ंड', '(कुल ₹999)'],
  ] as const)(
    'tells a full refund at once or its last part in %s',
    async (locale, once, rest, total) => {
      const email = (amount: number) =>
        refundEmail({
          locale,
          orderNumber: 'JO-ABCD2345',
          amount,
          refunded: 99_900,
          creditNoteNumber: 'JC/26-27/00002',
          full: true,
          productName: 'VYRO',
          accountUrl: 'https://example.test/account/orders',
        })
      expect((await email(99_900)).text).toContain(once)
      const last = (await email(59_900)).text
      expect(last).toContain(rest)
      expect(last).toContain(total)
      expect(last).not.toContain(once)
    },
  )
})
