import { describe, expect, it } from 'vitest'

import { autoReplyEmail, newsletterConfirmEmail, notificationEmail } from '@/emails'
import type { AutoReplyKind } from '@/emails'

import en from '../../messages/en.json'
import hi from '../../messages/hi.json'

const locales = { en, hi }
const kinds: AutoReplyKind[] = ['contact', 'project', 'waitlist', 'careers', 'data-request']

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
