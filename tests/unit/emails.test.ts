import { createHash } from 'node:crypto'
import { readdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  autoReplyEmail,
  dataRequestEmail,
  licenseStatusEmail,
  newsletterConfirmEmail,
  notificationEmail,
  orderConfirmationEmail,
  otpEmail,
  refundFailedEmail,
} from '@/emails'
import type { AutoReplyKind } from '@/emails'
import { sendEmail } from '@/lib/notify'
import { OUTBOX_DIR, outboxAdapter } from '@/lib/outbox'

import en from '../../messages/en.json'
import hi from '../../messages/hi.json'

const locales = { en, hi }
const kinds: AutoReplyKind[] = ['contact', 'project', 'waitlist', 'careers']

describe('autoReplyEmail', () => {
  it.each(['en', 'hi'] as const)(
    'renders every kind in %s with the subject from messages',
    async (locale) => {
      for (const kind of kinds) {
        const email = await autoReplyEmail({ locale, kind, product: 'VYRO' })
        const subject = locales[locale].email.autoReply[kind].subject.replace('{product}', 'VYRO')
        expect(email.subject).toBe(subject)
        expect(email.html).toContain(`lang="${locale}"`)
        expect(email.text).toContain(locales[locale].email.greeting)
        expect(email.text).toContain(locales[locale].email.note)
      }
    },
  )

  it('puts the product name in the waitlist subject and body', async () => {
    const email = await autoReplyEmail({ locale: 'hi', kind: 'waitlist', product: 'MenuMesh' })
    expect(email.subject).toBe('आप MenuMesh की वेटलिस्ट में हैं')
    expect(email.text).toContain('MenuMesh में रुचि के लिए धन्यवाद')
  })

  it('promises no launch email when the waitlist box was left unticked', async () => {
    const notify = await autoReplyEmail({ locale: 'en', kind: 'waitlist', product: 'Baby' })
    const none = await autoReplyEmail({
      locale: 'en',
      kind: 'waitlist',
      product: 'Baby',
      notify: false,
    })
    expect(notify.text).toContain("as soon as it's ready")
    expect(none.text).not.toContain("as soon as it's ready")
    expect(none.text).toContain('only email')
  })
})

describe('dataRequestEmail', () => {
  const request = { ticketNumber: 'JT-7K2QDM9X', receivedAt: '2026-11-01T10:00:00.000Z' }

  it.each(['en', 'hi'] as const)('gives a grievance its ticket and dates in %s', async (locale) => {
    const email = await dataRequestEmail({ locale, type: 'grievance', ...request })
    const m = locales[locale].email.dataRequest
    expect(email.subject).toBe(m.subjectGrievance.replace('{ticketNumber}', request.ticketNumber))
    expect(email.html).toContain(`lang="${locale}"`)
    expect(email.text).toContain(request.ticketNumber)
    expect(email.text).toContain(m.received)
    expect(email.text).toContain(m.status)
    expect(email.text).toContain(locales[locale].forms.dataRequest.types.grievance)
    expect(email.text).toContain(locales[locale].email.note)
  })

  it.each(['access', 'nomination'] as const)('quotes the ticket of a %s', async (type) => {
    const email = await dataRequestEmail({ locale: 'en', type, ...request })
    expect(email.subject).toContain(request.ticketNumber)
    expect(email.text).toContain(request.ticketNumber)
  })
})

describe('store notices', () => {
  it.each(['en', 'hi'] as const)(
    'tells a failed refund and a reinstatement in %s',
    async (locale) => {
      const m = locales[locale].email
      const failed = await refundFailedEmail({ locale, orderNumber: 'JO-1234ABCD', amount: 49_900 })
      expect(failed.subject).toBe(m.refundFailed.subject.replace('{orderNumber}', 'JO-1234ABCD'))
      expect(failed.text).toContain('₹499')
      expect(failed.text).toContain(m.refundFailed.next)

      const back = await licenseStatusEmail({
        locale,
        status: 'reinstated',
        productName: 'VYRO',
        licensesUrl: 'https://jainavinfotech.com/account/licenses',
      })
      expect(back.subject).toBe(m.licenseStatus.reinstated.subject.replace('{product}', 'VYRO'))
      expect(back.text).toContain(m.licenseStatus.reinstated.body.replace('{product}', 'VYRO'))
    },
  )

  it('promises nothing about what the app does right now', async () => {
    const copy = JSON.stringify([en.email.refund, en.email.licenseStatus, en.account.licenses])
    expect(copy).not.toContain('free version')
    expect(
      JSON.stringify([hi.email.refund, hi.email.licenseStatus, hi.account.licenses]),
    ).not.toContain('फ़्री वर्ज़न')
  })
})

describe('newsletterConfirmEmail', () => {
  const confirmUrl = 'https://jainavinfotech.com/api/v1/forms/newsletter/confirm?token=abc'
  const unsubscribeUrl = 'https://jainavinfotech.com/api/v1/forms/unsubscribe?token=xyz'

  it.each(['en', 'hi'] as const)('has the confirm and unsubscribe links in %s', async (locale) => {
    const email = await newsletterConfirmEmail({ locale, confirmUrl, unsubscribeUrl })
    const m = locales[locale].email.newsletter
    expect(email.subject).toBe(m.subject)
    for (const out of [email.html, email.text]) {
      expect(out).toContain(confirmUrl)
      expect(out).toContain(unsubscribeUrl)
    }
    expect(email.text).toContain(m.expiry)
    expect(email.text).toContain(m.unsubscribe)
  })
})

describe('notificationEmail', () => {
  it('escapes field values, keeps line breaks and links to the admin', async () => {
    const email = await notificationEmail({
      title: 'New contact message',
      adminUrl: 'http://localhost:3000/admin/collections/leads/42',
      fields: [
        ['Name', '<script>alert(1)</script>'],
        ['Message', 'first line\nsecond line'],
      ],
    })
    expect(email.subject).toBe('New contact message')
    expect(email.html).toContain('lang="en"')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).toContain('http://localhost:3000/admin/collections/leads/42')
    expect(email.text).toMatch(/Message +first line\r?\n +second line/)
    expect(email.text).toContain(en.email.openInAdmin)
  })
})

// The text react-email hides in the preview block, before the visible body.
const preview = (html: string) =>
  html.match(/<div[^>]*display:none[^>]*>([^]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g, '') ?? ''

describe('otpEmail', () => {
  it.each(['en', 'hi'] as const)('shows the code only in the body in %s', async (locale) => {
    const email = await otpEmail({ locale, code: '482913' })
    const m = locales[locale].email.otp
    expect(email.subject).toBe(m.subject)
    expect(email.subject).not.toMatch(/\d{6}/)
    expect(preview(email.html)).toContain(m.body)
    expect(preview(email.html)).not.toContain('482913')
    expect(email.html).toContain('>482913<')
    expect(email.text).toContain('482913')
    expect(email.text).toContain(m.expiry)
    expect(email.text).toContain(m.ignore)
  })
})

describe('orderConfirmationEmail', () => {
  const order = {
    orderNumber: 'JV-2026-00042',
    productName: 'VYRO',
    planName: 'Pro',
    total: 99_900,
    invoiceNumber: 'JI/26-27/00001',
    accountUrl: 'https://jainavinfotech.com/account/orders',
  }

  it('reaches the outbox with the PDF as a fingerprint, its bytes intact', async () => {
    // Bytes that aren't valid UTF-8 must survive the base64 round trip.
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0x00, 0xe2, 0x82])
    const adapter = outboxAdapter({ payload: {} as Payload })
    const payload = { sendEmail: adapter.sendEmail } as unknown as Payload
    const before = new Set(await readdir(OUTBOX_DIR).catch(() => []))
    await sendEmail(
      payload,
      'buyer@example.com',
      await orderConfirmationEmail({ locale: 'en', ...order }),
      {
        attachments: [
          { filename: 'JI-26-27-00001.pdf', content: pdf, contentType: 'application/pdf' },
        ],
      },
    )
    const file = (await readdir(OUTBOX_DIR)).find((f) => !before.has(f))!
    const saved = JSON.parse(await readFile(path.join(OUTBOX_DIR, file), 'utf8'))
    await rm(path.join(OUTBOX_DIR, file))
    expect(saved.attachments).toEqual([
      {
        filename: 'JI-26-27-00001.pdf',
        contentType: 'application/pdf',
        size: pdf.length,
        sha256: createHash('sha256').update(pdf).digest('hex'),
      },
    ])
  })

  it.each(['en', 'hi'] as const)('confirms the order in %s', async (locale) => {
    const email = await orderConfirmationEmail({ locale, ...order })
    const m = locales[locale].email.order
    expect(email.subject).toBe(m.subject.replace('{orderNumber}', order.orderNumber))
    expect(email.html).toContain(`lang="${locale}"`)
    expect(email.html).toContain(order.accountUrl)
    for (const part of [
      m.thanks,
      order.orderNumber,
      'VYRO Pro',
      '₹999',
      m.invoice.replace('{invoiceNumber}', order.invoiceNumber),
      m.button,
      m.support,
    ]) {
      expect(email.text).toContain(part)
    }
  })
})
