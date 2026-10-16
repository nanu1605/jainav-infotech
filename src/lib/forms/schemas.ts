// zod/mini: these schemas also validate in the browser, where classic Zod costs ~90 KB.
import * as z from 'zod/mini'

import { routing } from '@/i18n/routing'

/**
 * Versions of the consent notice beside every submit button and of the marketing checkbox text
 * (spec §13, messages `forms.consent`). Bump one whenever its wording changes: leads store the
 * version they agreed to, and the wording of each version stays in git history.
 */
export const CONSENT_VERSION = '2026-10-16'
export const MARKETING_VERSION = '2026-10-16'

export const CONTACT_TOPICS = [
  'sales',
  'support',
  'partnership',
  'careers',
  'press',
  'other',
] as const
export const PROJECT_BUDGETS = ['under-2l', '2-5l', '5-15l', 'over-15l', 'unsure'] as const
export const PROJECT_TIMELINES = ['asap', '1-3m', '3-6m', 'flexible'] as const
export const DATA_REQUEST_TYPES = [
  'access',
  'correction',
  'erasure',
  'withdraw-consent',
  'grievance',
] as const
export const CV_MAX_BYTES = 5 * 1024 * 1024

// Postgres text columns refuse NUL, so a pasted one would fail the save.
const noNul = z.overwrite((s: string) => s.replaceAll('\u0000', ''))
/** Payload's email field rule (stricter than z.email: domain labels end in a letter or digit). */
const PAYLOAD_EMAIL =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

// Error messages are keys into `forms.errors`; the form translates them.
const text = (max: number, ...checks: z.core.$ZodCheck<string>[]) =>
  z.string().check(noNul, z.trim(), z.maxLength(max, 'tooLong'), ...checks)
const required = (max: number, ...checks: z.core.$ZodCheck<string>[]) =>
  text(max, z.minLength(1, 'required'), ...checks)
const email = z.pipe(
  z.string().check(z.trim(), z.maxLength(254, 'tooLong')),
  z.email('email').check(z.regex(PAYLOAD_EMAIL, 'email')),
)
const phone = z.string().check(z.trim(), z.regex(/^$|^\+?[\d\s()-]{7,20}$/, 'phone'))
const slug = z.string().check(z.trim(), z.regex(/^$|^[a-z0-9-]{1,100}$/, 'choose'))
const chosen = z.string().check(z.trim(), z.regex(/^[a-z0-9-]{1,100}$/, 'choose'))

export const contactSchema = z.object({
  topic: z.enum(CONTACT_TOPICS, 'choose'),
  name: required(100),
  email,
  phone,
  company: text(150),
  product: slug,
  message: required(5000),
  marketing: z.boolean(),
})

export const projectSchema = z.object({
  service: chosen,
  description: required(5000, z.minLength(20, 'tooShort')),
  budget: z.enum(PROJECT_BUDGETS, 'choose'),
  timeline: z.enum(PROJECT_TIMELINES, 'choose'),
  name: required(100),
  email,
  phone,
  company: text(150),
  marketing: z.boolean(),
})

export const waitlistSchema = z.object({
  product: chosen,
  email,
  marketing: z.boolean(),
})

export const newsletterSchema = z.object({ email })

/** The CV is a file, checked separately (client: the input; server: size and PDF bytes). */
export const careersSchema = z.object({
  job: slug,
  name: required(100),
  email,
  phone,
  links: text(500),
  message: text(3000),
})

export const dataRequestSchema = z.object({
  type: z.enum(DATA_REQUEST_TYPES, 'choose'),
  email,
  details: required(3000),
})

export const formSchemas = {
  contact: contactSchema,
  project: projectSchema,
  waitlist: waitlistSchema,
  newsletter: newsletterSchema,
  careers: careersSchema,
  'data-request': dataRequestSchema,
}
export type FormName = keyof typeof formSchemas
export const isFormName = (name: string): name is FormName => Object.hasOwn(formSchemas, name)

const meta = (max: number) => z.catch(z.string().check(noNul, z.maxLength(max)), '')

/** Sent with every form next to its fields: where it was filled in and the spam checks. */
export const metaSchema = z.object({
  locale: z.catch(z.enum(routing.locales), routing.defaultLocale),
  page: meta(500),
  referrer: meta(500),
  utm: z.catch(
    z.partial(
      z.object({
        source: meta(100),
        medium: meta(100),
        campaign: meta(100),
        term: meta(100),
        content: meta(100),
      }),
    ),
    {},
  ),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.catch(z.string(), ''),
  turnstile: meta(4096),
})
export type FormMeta = z.infer<typeof metaSchema>
