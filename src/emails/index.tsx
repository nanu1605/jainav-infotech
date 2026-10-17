import 'server-only'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  render,
  Section,
  Text,
} from '@react-email/components'
import { createTranslator } from 'next-intl'
import type { CSSProperties, ReactElement, ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'
import { formatDate, formatINR } from '@/lib/format'
import { tokens } from '@/styles/tokens.generated'

import en from '../../messages/en.json'
import hi from '../../messages/hi.json'

export type RenderedEmail = { subject: string; html: string; text: string }
export type AutoReplyKind = 'contact' | 'project' | 'waitlist' | 'careers' | 'data-request'

// Static imports: these render inside after(), where there is no request to read messages from.
const messages: Record<Locale, typeof en> = { en, hi }
const translator = (locale: Locale) =>
  createTranslator({ locale, messages: messages[locale], namespace: 'email' })

// Mail clients need inline values. Light theme only: most clients ignore or rewrite dark styles.
const c = tokens.light
// No web fonts in mail: system faces, with Devanagari ones for Hindi.
const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans Devanagari', 'Nirmala UI', Mangal, sans-serif"

// Hindi needs room for matras (line height 1.75 instead of 1.5).
const bodyText = (locale: Locale): CSSProperties => ({
  margin: '0 0 16px',
  fontSize: '16px',
  lineHeight: locale === 'hi' ? '28px' : '24px',
  color: c.fg,
})
const smallText = (locale: Locale): CSSProperties => ({
  margin: '0 0 8px',
  fontSize: '13px',
  lineHeight: locale === 'hi' ? '22px' : '20px',
  color: c['fg-muted'],
})
const button: CSSProperties = {
  margin: '8px 0 24px',
  padding: '12px 20px',
  borderRadius: '6px',
  backgroundColor: c.primary,
  color: c['primary-fg'],
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
}

function Layout({
  locale,
  preview,
  footer,
  children,
}: {
  locale: Locale
  preview: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: '24px 8px', backgroundColor: c.bg, fontFamily }}>
        <Container
          style={{
            maxWidth: '560px',
            padding: '32px',
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: '8px',
          }}
        >
          <Text style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700, color: c.fg }}>
            {translator(locale)('brand')}
          </Text>
          {children}
          {footer && (
            <>
              <Hr style={{ margin: '32px 0 16px', borderColor: c.border }} />
              <Section>{footer}</Section>
            </>
          )}
        </Container>
      </Body>
    </Html>
  )
}

// Plain text: the notification's fields stay a label/value table; headings keep their case.
const htmlToTextOptions = {
  selectors: [
    { selector: 'h1', options: { uppercase: false } },
    { selector: 'table.fields', format: 'dataTable', options: { uppercaseHeaderCells: false } },
  ],
}

async function renderEmail(subject: string, email: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(email),
    render(email, { plainText: true, htmlToTextOptions }),
  ])
  return { subject, html, text }
}

/**
 * Auto-reply to a form (spec §13). It never repeats what the visitor typed, so the forms can't be
 * used to send someone else's words to a third party's inbox. `product` is our own product name.
 * `notify`: a waitlist sign-up ticked the box for the launch email (without it, none is promised).
 */
export function autoReplyEmail({
  locale,
  kind,
  product,
  notify = true,
}: {
  locale: Locale
  kind: AutoReplyKind
  product?: string | null
  notify?: boolean
}): Promise<RenderedEmail> {
  const t = translator(locale)
  const values = { product: product || t('brand') }
  const subject = t(`autoReply.${kind}.subject`, values)
  const body =
    kind === 'waitlist' && !notify
      ? t('autoReply.waitlist.bodyNoEmail', values)
      : t(`autoReply.${kind}.body`, values)
  return renderEmail(
    subject,
    <Layout
      locale={locale}
      preview={body}
      footer={<Text style={smallText(locale)}>{t('note')}</Text>}
    >
      <Text style={bodyText(locale)}>{t('greeting')}</Text>
      <Text style={bodyText(locale)}>{body}</Text>
      <Text style={bodyText(locale)}>{t('signoff')}</Text>
    </Layout>,
  )
}

/** Label/value rows (plain text keeps them a table: `table.fields` in htmlToTextOptions). */
function Fields({ locale, rows }: { locale: Locale; rows: [label: string, value: string][] }) {
  const cell: CSSProperties = {
    padding: '8px 0',
    borderBottom: `1px solid ${c.border}`,
    verticalAlign: 'top',
    textAlign: 'left',
    fontSize: '14px',
    lineHeight: locale === 'hi' ? '24px' : '22px',
  }
  return (
    <table
      className="fields"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse' }}
    >
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i}>
            <th
              scope="row"
              style={{ ...cell, width: '35%', paddingRight: '16px', color: c['fg-muted'] }}
            >
              {label}
            </th>
            <td style={{ ...cell, color: c.fg }}>
              {value.split(/\r?\n/).flatMap((line, j) => (j ? [<br key={j} />, line] : [line]))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Internal notification for a new lead (English only): its fields and a link to the admin. */
export function notificationEmail({
  title,
  adminUrl,
  fields,
}: {
  title: string
  adminUrl: string
  fields: [label: string, value: string][]
}): Promise<RenderedEmail> {
  return renderEmail(
    title,
    <Layout locale="en" preview={title}>
      <Heading as="h1" style={{ margin: '0 0 16px', fontSize: '22px', color: c.fg }}>
        {title}
      </Heading>
      <Fields locale="en" rows={fields} />
      <Button href={adminUrl} style={{ ...button, marginTop: '24px' }}>
        {translator('en')('openInAdmin')}
      </Button>
    </Layout>,
  )
}

/**
 * Sign-in code (spec §11.2). The code is only in the body: subjects and preview text show up in
 * notifications and lock screens.
 */
export function otpEmail({
  locale,
  code,
}: {
  locale: Locale
  code: string
}): Promise<RenderedEmail> {
  const t = translator(locale)
  return renderEmail(
    t('otp.subject'),
    <Layout
      locale={locale}
      preview={t('otp.body')}
      footer={<Text style={smallText(locale)}>{t('otp.ignore')}</Text>}
    >
      <Text style={bodyText(locale)}>{t('greeting')}</Text>
      <Text style={bodyText(locale)}>{t('otp.body')}</Text>
      <Text
        style={{
          margin: '8px 0 24px',
          padding: '16px',
          backgroundColor: c['bg-subtle'],
          border: `1px solid ${c.border}`,
          borderRadius: '6px',
          textAlign: 'center',
          fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
          fontSize: '32px',
          lineHeight: '40px',
          fontWeight: 700,
          // Spacing by CSS, not spaces, so a copied code pastes as six digits.
          letterSpacing: '8px',
          userSelect: 'all',
          color: c.fg,
        }}
      >
        {code}
      </Text>
      <Text style={bodyText(locale)}>{t('otp.expiry')}</Text>
    </Layout>,
  )
}

/**
 * Order confirmation (spec §11.3 step 8, §11.7), sent with the invoice PDF attached. `total` is
 * in paise.
 */
export function orderConfirmationEmail({
  locale,
  orderNumber,
  productName,
  planName,
  total,
  invoiceNumber,
  licenseKey,
  accountUrl,
}: {
  locale: Locale
  orderNumber: string
  productName: string
  planName: string
  total: number
  invoiceNumber: string
  /** Phase 8 (spec §11.7): the key of the license the order created. */
  licenseKey?: string
  accountUrl: string
}): Promise<RenderedEmail> {
  const t = translator(locale)
  return renderEmail(
    t('order.subject', { orderNumber }),
    <Layout
      locale={locale}
      preview={t('order.thanks')}
      footer={<Text style={smallText(locale)}>{t('order.support')}</Text>}
    >
      <Text style={bodyText(locale)}>{t('greeting')}</Text>
      <Text style={bodyText(locale)}>{t('order.thanks')}</Text>
      <Fields
        locale={locale}
        rows={[
          [t('order.number'), orderNumber],
          [t('order.item'), t('order.itemValue', { product: productName, plan: planName })],
          [t('order.total'), formatINR(locale, total)],
        ]}
      />
      {licenseKey && (
        <LicenseKeySection locale={locale} product={productName} licenseKey={licenseKey} />
      )}
      <Text style={{ ...bodyText(locale), marginTop: '24px' }}>
        {t('order.invoice', { invoiceNumber })}
      </Text>
      <Button href={accountUrl} style={button}>
        {t('order.button')}
      </Button>
      <Text style={bodyText(locale)}>{t('signoff')}</Text>
    </Layout>,
  )
}

const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

/** A license key, selected whole with one click, and where it goes (spec §11.7). */
function LicenseKeySection({
  locale,
  product,
  licenseKey,
}: {
  locale: Locale
  product: string
  licenseKey: string
}) {
  const t = translator(locale)
  return (
    <>
      <Text style={{ ...bodyText(locale), marginTop: '24px' }}>
        {t('license.keyIntro', { product })}
      </Text>
      <Text
        style={{
          margin: '8px 0 16px',
          padding: '12px 16px',
          backgroundColor: c['bg-subtle'],
          border: `1px solid ${c.border}`,
          borderRadius: '6px',
          textAlign: 'center',
          fontFamily: mono,
          fontSize: '18px',
          lineHeight: '28px',
          fontWeight: 700,
          userSelect: 'all',
          wordBreak: 'break-all',
          color: c.fg,
        }}
      >
        {licenseKey}
      </Text>
      <Text style={bodyText(locale)}>{t('license.keyHelp', { product })}</Text>
    </>
  )
}

/**
 * A complimentary or manually issued license (spec §10, §11.7): its key, plan and update period.
 * `updatesUntil` null means lifetime updates.
 */
export function licenseIssuedEmail({
  locale,
  productName,
  planName,
  licenseKey,
  updatesUntil,
  licensesUrl,
}: {
  locale: Locale
  productName: string
  planName: string
  licenseKey: string
  updatesUntil: string | null
  licensesUrl: string
}): Promise<RenderedEmail> {
  const t = translator(locale)
  return renderEmail(
    t('license.subject', { product: productName }),
    <Layout
      locale={locale}
      preview={t('license.body', { product: productName })}
      footer={<Text style={smallText(locale)}>{t('license.support')}</Text>}
    >
      <Text style={bodyText(locale)}>{t('greeting')}</Text>
      <Text style={bodyText(locale)}>{t('license.body', { product: productName })}</Text>
      <Fields
        locale={locale}
        rows={[
          [t('order.item'), t('order.itemValue', { product: productName, plan: planName })],
          [
            t('license.updates'),
            updatesUntil ? formatDate(locale, updatesUntil) : t('license.lifetime'),
          ],
        ]}
      />
      <LicenseKeySection locale={locale} product={productName} licenseKey={licenseKey} />
      <Button href={licensesUrl} style={button}>
        {t('license.button')}
      </Button>
      <Text style={bodyText(locale)}>{t('signoff')}</Text>
    </Layout>,
  )
}

/**
 * A license was activated on a new device (spec §11.7). Device names come from the app; React
 * escapes them. The time is shown in IST.
 */
export function deviceActivatedEmail({
  locale,
  productName,
  deviceName,
  os,
  activatedAt,
  licensesUrl,
}: {
  locale: Locale
  productName: string
  deviceName: string
  os: string
  activatedAt: string
  licensesUrl: string
}): Promise<RenderedEmail> {
  const t = translator(locale)
  return renderEmail(
    t('device.subject', { product: productName }),
    <Layout
      locale={locale}
      preview={t('device.body', { product: productName })}
      footer={<Text style={smallText(locale)}>{t('device.notYou')}</Text>}
    >
      <Text style={bodyText(locale)}>{t('greeting')}</Text>
      <Text style={bodyText(locale)}>{t('device.body', { product: productName })}</Text>
      <Fields
        locale={locale}
        rows={[
          [t('device.name'), deviceName],
          [t('device.os'), os],
          [
            t('device.when'),
            `${formatDate(locale, activatedAt, { dateStyle: 'medium', timeStyle: 'short' })} IST`,
          ],
        ]}
      />
      <Button href={licensesUrl} style={button}>
        {t('device.button')}
      </Button>
      <Text style={bodyText(locale)}>{t('signoff')}</Text>
    </Layout>,
  )
}

/** Double opt-in for the newsletter (spec §13): confirm button, expiry, unsubscribe link. */
export function newsletterConfirmEmail({
  locale,
  confirmUrl,
  unsubscribeUrl,
}: {
  locale: Locale
  confirmUrl: string
  unsubscribeUrl: string
}): Promise<RenderedEmail> {
  const t = translator(locale)
  return renderEmail(
    t('newsletter.subject'),
    <Layout
      locale={locale}
      preview={t('newsletter.body')}
      footer={
        <>
          <Text style={smallText(locale)}>{t('note')}</Text>
          <Link href={unsubscribeUrl} style={{ ...smallText(locale), textDecoration: 'underline' }}>
            {t('newsletter.unsubscribe')}
          </Link>
        </>
      }
    >
      <Text style={bodyText(locale)}>{t('greeting')}</Text>
      <Text style={bodyText(locale)}>{t('newsletter.body')}</Text>
      <Button href={confirmUrl} style={button}>
        {t('newsletter.button')}
      </Button>
      <Text style={smallText(locale)}>{t('newsletter.expiry')}</Text>
      <Text style={bodyText(locale)}>{t('signoff')}</Text>
    </Layout>,
  )
}
