/**
 * Retention against a real database (spec §16): a lead's last contact, the daily purge of leads
 * and CVs, closed privacy requests, and the removal of orders and invoices, which stays off until
 * the Owner turns it on. Telegram is stubbed.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { istDate } from '@/lib/format'
import type { Order, User } from '@/payload-types'
import config from '@/payload.config'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const { applyRetention, ordersKeptFrom } = await import('@/lib/retention')

let payload: Payload
const run = `rt${Date.now()}`
const address = (name: string) => `${name}.${run}@retention.test`
const db = () => (payload.db as unknown as PostgresAdapter).drizzle
const telegrams: string[] = []
const users: Record<'owner' | 'support', User> = {} as never
const ids: { product?: number; plan?: number; customer?: number } = {}
const pdf = Buffer.from(`%PDF-1.4\n${' '.repeat(2000)}\nxref\n0 1\ntrailer\nstartxref\n9\n%%EOF\n`)

const settings = (data: Record<string, unknown>) =>
  payload.updateGlobal({ slug: 'retention-settings', data, depth: 0, overrideAccess: true })
const exists = async (collection: 'leads' | 'data-requests' | 'private-files', id: number) =>
  Boolean(
    await payload.findByID({
      collection,
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    }),
  )

async function lead(name: string, data: object = {}) {
  return payload.create({
    collection: 'leads',
    data: { type: 'contact', status: 'new', email: address(name), ...data },
    depth: 0,
    overrideAccess: true,
  })
}

/** Moves a lead back in time, as the database would hold it. */
const age = (id: number, lastContact: string, createdAt = lastContact) =>
  db().execute(
    sql`UPDATE leads SET last_activity_at = ${lastContact}, created_at = ${createdAt} WHERE id = ${id}`,
  )

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
const recent = (date: string | null | undefined) => Date.parse(date ?? '') > Date.now() - 60_000

beforeAll(async () => {
  payload = await getPayload({ config })
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.TELEGRAM_CHAT_ID = '42'
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes('api.telegram.org')) {
      telegrams.push(JSON.parse(String(init?.body)).text)
      return Response.json({ ok: true })
    }
    return realFetch(input, init)
  })
  for (const role of ['owner', 'support'] as const) {
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password: `pw-${run}`, roles: [role] },
      depth: 0,
      overrideAccess: true,
    })
  }
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Retention test',
      slug: `${run}-app`,
      tagline: 'Tagline',
      type: 'desktop',
      category: 'other',
      status: 'live',
      hostingMode: 'hosted',
      accentColor: '#123456',
      primaryButton: { type: 'contact' },
      hiStatus: 'missing',
      _status: 'published',
    },
    depth: 0,
    overrideAccess: true,
  })
  ids.product = product.id
  const plan = await payload.create({
    collection: 'plans',
    data: { product: product.id, code: 'pro', name: 'Pro', billing: 'one_time', priceINR: 99_900 },
    depth: 0,
    overrideAccess: true,
  })
  ids.plan = plan.id
  const customer = await payload.create({
    collection: 'customers',
    data: { email: address('buyer'), preferredLocale: 'en', status: 'active' },
    depth: 0,
    overrideAccess: true,
  })
  ids.customer = customer.id
})

beforeEach(async () => {
  telegrams.length = 0
  // Back to the defaults: the row appears on the first save.
  await db().execute(sql`DELETE FROM retention_settings`)
})

afterAll(async () => {
  vi.unstubAllGlobals()
  const like = `%${run}%`
  await db().execute(sql`UPDATE licenses SET order_id = NULL WHERE customer_id = ${ids.customer!}`)
  await db().execute(sql`DELETE FROM licenses WHERE customer_id = ${ids.customer!}`)
  await db().execute(sql`UPDATE orders SET invoice_id = NULL WHERE billing_email LIKE ${like}`)
  await db().execute(sql`DELETE FROM invoices WHERE buyer_email LIKE ${like}`)
  await db().execute(sql`DELETE FROM orders WHERE billing_email LIKE ${like}`)
  await db().execute(sql`DELETE FROM customers WHERE id = ${ids.customer!}`)
  await db().execute(sql`DELETE FROM leads WHERE email LIKE ${like}`)
  await db().execute(sql`DELETE FROM data_requests WHERE email LIKE ${like}`)
  await db().execute(sql`DELETE FROM retention_settings`)
  await payload.delete({
    collection: 'plans',
    where: { product: { equals: ids.product! } },
    overrideAccess: true,
  })
  await payload.delete({ collection: 'products', id: ids.product!, overrideAccess: true })
  await payload.delete({
    collection: 'users',
    where: { email: { like: run } },
    overrideAccess: true,
  })
})

describe('a lead’s last contact', () => {
  it('starts at the submission and moves when staff save it, not when someone unsubscribes', async () => {
    const created = await lead('stamp')
    expect(created.lastActivityAt).toBeTruthy()
    const old = '2020-01-01T00:00:00.000Z'
    await age(created.id, old)
    const update = (data: object, user?: User) =>
      payload.update({
        collection: 'leads',
        id: created.id,
        data,
        depth: 0,
        ...(user ? { overrideAccess: false, user } : { overrideAccess: true }),
      })

    const unsubscribed = await update({ unsubscribedAt: new Date().toISOString() })
    expect(unsubscribed.lastActivityAt).toBe(old)

    const saved = await update({ notes: 'Called them.' }, users.support)
    expect(recent(saved.lastActivityAt)).toBe(true)
  })

  it('takes an entered date only from the Owner, and a future day from nobody', async () => {
    const { id } = await lead('entered')
    const earlier = '2024-06-01T00:00:00.000Z'
    const update = (lastActivityAt: string, user: User) =>
      payload.update({
        collection: 'leads',
        id,
        data: { lastActivityAt },
        depth: 0,
        overrideAccess: false,
        user,
      })
    await age(id, '2026-01-01T00:00:00.000Z')

    // Support's save is a plain save, typed date or stale form alike, in bulk too.
    expect(recent((await update(earlier, users.support)).lastActivityAt)).toBe(true)
    await age(id, '2026-01-01T00:00:00.000Z')
    const { docs } = await payload.update({
      collection: 'leads',
      where: { id: { equals: id } },
      data: { lastActivityAt: earlier },
      depth: 0,
      overrideAccess: false,
      user: users.support,
    })
    expect(recent(docs[0]?.lastActivityAt)).toBe(true)

    expect((await update(earlier, users.owner)).lastActivityAt).toBe(earlier)
    // Today stands, though the date picker's time may still be ahead of the clock.
    const today = `${istDate()}T12:00:00.000Z`
    expect((await update(today, users.owner)).lastActivityAt).toBe(today)

    for (const user of [users.owner, users.support]) {
      await expect(update(daysAgo(-2), user)).rejects.toMatchObject({ status: 400 })
    }
  })
})

describe('a privacy request’s closing date', () => {
  it('takes an entered date only from the Owner, and a future day from nobody', async () => {
    const doc = await payload.create({
      collection: 'data-requests',
      data: { email: address('closing'), type: 'access', details: 'x', status: 'new' },
      depth: 0,
      overrideAccess: true,
    })
    const earlier = '2024-06-01T00:00:00.000Z'
    const save = (data: object, user: User) =>
      payload.update({
        collection: 'data-requests',
        id: doc.id,
        data,
        depth: 0,
        overrideAccess: false,
        user,
      })

    // Closing stamps today over what Support entered, and a later save leaves it.
    const closed = await save({ status: 'completed', handledAt: earlier }, users.support)
    expect(recent(closed.handledAt)).toBe(true)
    expect((await save({ handledAt: earlier }, users.support)).handledAt).toBe(closed.handledAt)

    expect((await save({ handledAt: earlier }, users.owner)).handledAt).toBe(earlier)
    expect((await save({ status: 'in-progress' }, users.owner)).handledAt).toBeFalsy()
    const owners = await save({ status: 'rejected', handledAt: earlier }, users.owner)
    expect(owners.handledAt).toBe(earlier)

    for (const user of [users.owner, users.support]) {
      await expect(save({ handledAt: daysAgo(-2) }, user)).rejects.toMatchObject({ status: 400 })
    }
    await payload.delete({ collection: 'data-requests', id: doc.id, overrideAccess: true })
  })
})

describe('the purge', () => {
  it('deletes leads and their CVs after the period, keeping the rest', async () => {
    const file = await payload.create({
      collection: 'private-files',
      data: { purpose: 'cv' },
      file: { data: pdf, mimetype: 'application/pdf', name: `cv-${run}.pdf`, size: pdf.length },
      depth: 0,
      overrideAccess: true,
    })
    const stale = await lead('stale', { type: 'careers', attachments: [file.id] })
    const fresh = await lead('fresh')
    const justInside = await lead('inside')
    const unconfirmed = await lead('unconfirmed', { type: 'newsletter' })
    const recentSignUp = await lead('recent-signup', { type: 'newsletter' })
    const subscriber = await lead('subscriber', {
      type: 'newsletter',
      confirmedAt: daysAgo(90),
    })
    const lapsed = await lead('lapsed', { type: 'newsletter', confirmedAt: daysAgo(800) })
    await age(lapsed.id, daysAgo(800))
    await age(stale.id, daysAgo(800))
    await age(justInside.id, daysAgo(700))
    await age(unconfirmed.id, daysAgo(31))
    await age(recentSignUp.id, daysAgo(5))
    await age(subscriber.id, daysAgo(90))

    // No settings saved yet: the default of 24 months applies.
    await applyRetention()

    expect(await exists('leads', stale.id)).toBe(false)
    expect(await exists('private-files', file.id)).toBe(false)
    expect(await exists('leads', unconfirmed.id)).toBe(false)
    expect(await exists('leads', lapsed.id)).toBe(false)
    for (const kept of [fresh, justInside, recentSignUp, subscriber]) {
      expect(await exists('leads', kept.id)).toBe(true)
    }
    expect(telegrams.at(-1)).toMatch(/^Retention: removed \d+ leads\.$/)

    // A shorter period, once the Owner sets one.
    await settings({ leadMonths: 12 })
    telegrams.length = 0
    await applyRetention()
    expect(await exists('leads', justInside.id)).toBe(false)
    expect(await exists('leads', fresh.id)).toBe(true)
  })

  it('holds a lead back while its address has an open privacy request', async () => {
    const held = await lead('held')
    await age(held.id, daysAgo(800))
    const request = await payload.create({
      collection: 'data-requests',
      data: { email: held.email, type: 'erasure', details: 'x', status: 'in-progress' },
      depth: 0,
      overrideAccess: true,
    })
    await applyRetention()
    expect(await exists('leads', held.id)).toBe(true)

    await payload.update({
      collection: 'data-requests',
      id: request.id,
      data: { status: 'completed' },
      depth: 0,
      overrideAccess: true,
    })
    await applyRetention()
    expect(await exists('leads', held.id)).toBe(false)
  })

  it('alerts when leads can’t be deleted', async () => {
    const remove = vi
      .spyOn(payload, 'delete')
      .mockResolvedValueOnce({ docs: [], errors: [{ id: 1, message: 'x' }] } as never)
    await applyRetention()
    remove.mockRestore()
    expect(telegrams).toEqual([
      'Retention: 1 leads could not be deleted. They stay until this is fixed.',
    ])
  })

  it('says nothing when nothing went', async () => {
    await applyRetention()
    expect(telegrams).toEqual([])
  })

  it('keeps closed privacy requests until a period is set, and never deletes open ones', async () => {
    const request = async (name: string, status: 'new' | 'completed', handledAt?: string) =>
      payload.create({
        collection: 'data-requests',
        data: { email: address(name), type: 'access', details: 'x', status, handledAt },
        depth: 0,
        overrideAccess: true,
      })
    const oldClosed = await request('closed-old', 'completed', daysAgo(800))
    const newClosed = await request('closed-new', 'completed', daysAgo(30))
    const oldOpen = await request('open-old', 'new')
    await db().execute(
      sql`UPDATE data_requests SET created_at = ${daysAgo(800)} WHERE id = ${oldOpen.id}`,
    )

    await applyRetention()
    expect(await exists('data-requests', oldClosed.id)).toBe(true)

    await settings({ dataRequestMonths: 12 })
    await applyRetention()
    expect(await exists('data-requests', oldClosed.id)).toBe(false)
    expect(await exists('data-requests', newClosed.id)).toBe(true)
    expect(await exists('data-requests', oldOpen.id)).toBe(true)
    expect(telegrams.at(-1)).toContain('1 closed privacy requests')
  })

  it('counts a reopened privacy request from its last closing', async () => {
    await settings({ dataRequestMonths: 12 })
    const doc = await payload.create({
      collection: 'data-requests',
      data: {
        email: address('reopened'),
        type: 'access',
        details: 'x',
        status: 'completed',
        handledAt: daysAgo(800),
      },
      depth: 0,
      overrideAccess: true,
    })
    const setStatus = (status: 'in-progress' | 'completed') =>
      payload.update({
        collection: 'data-requests',
        id: doc.id,
        data: { status },
        depth: 0,
        overrideAccess: true,
      })
    expect((await setStatus('in-progress')).handledAt).toBeFalsy()
    const closed = await setStatus('completed')
    expect(Date.parse(closed.handledAt!)).toBeGreaterThan(Date.now() - 60_000)
    await applyRetention()
    expect(await exists('data-requests', doc.id)).toBe(true)
  })
})

describe('the settings', () => {
  it('refuses a period short enough to be a typo', async () => {
    await expect(settings({ leadMonths: 2 })).rejects.toThrow()
    await expect(settings({ dataRequestMonths: 1 })).rejects.toThrow()
    await expect(settings({ orderFinancialYears: 1 })).rejects.toThrow()
  })

  it('alerts when the job applying them fails, as nothing else would say', async () => {
    const task = payload.config.jobs.tasks?.find((t) => t.slug === 'cleanup')
    // Only the fields the hook reads, of what Payload passes.
    await task?.onFail?.({ job: { id: 7 }, taskStatus: { totalTried: 0 } } as never)
    expect(telegrams.at(-1)).toBe('Job cleanup #7 failed after 1 attempt.')
  })
})

describe('orders and invoices', () => {
  const FIRST_KEPT = '2027-04-01T00:00:00+05:30'
  // Eight years on: financial year 2026-27 has just gone.
  const AFTER = new Date('2035-04-01T00:00:00+05:30')
  const BEFORE = new Date('2035-03-31T23:59:00+05:30')

  async function sale(name: string, paidAt: string) {
    const email = address(name)
    const amount = 99_900
    const tax = { mode: 'none' as const, taxable: amount, cgst: 0, sgst: 0, igst: 0 }
    const data: RequiredDataFromCollectionSlug<'orders'> = {
      orderNumber: `${run}-${name}`,
      customer: ids.customer!,
      status: 'paid',
      amountRefunded: 0,
      paidAt,
      locale: 'en',
      items: [
        { product: ids.product!, plan: ids.plan!, qty: 1, unitPrice: amount, description: 'App' },
      ],
      currency: 'INR',
      subtotal: amount,
      discount: 0,
      total: amount,
      tax: { ...tax, ratePercent: 0 },
      billing: { name: 'Priya', email, country: 'IN', stateCode: '23', stateName: 'MP' },
      acceptance: { termsVersion: '1.0', eulaVersion: '1.0', at: paidAt },
    }
    const order = await payload.create({ collection: 'orders', data, overrideAccess: true })
    await db().execute(
      sql`UPDATE orders SET created_at = ${paidAt}, updated_at = ${paidAt} WHERE id = ${order.id}`,
    )
    return { order, invoice: await document(name, 'invoice', order, paidAt) }
  }

  async function document(
    name: string,
    kind: 'invoice' | 'credit-note',
    order: Order,
    issuedAt: string,
    originalInvoice?: number,
  ) {
    const amount = 99_900
    const tax = { taxable: amount, cgst: 0, sgst: 0, igst: 0 }
    return payload.create({
      collection: 'invoices',
      data: {
        number: `${kind[0]}${String(order.id).slice(-4)}${name}`.slice(0, 16),
        kind,
        financialYear: '26-27',
        order: order.id,
        issuedAt,
        originalInvoice,
        seller: { legalName: 'Jainav Infotech', stateCode: '23', stateName: 'MP' },
        buyer: {
          name: 'Priya',
          email: order.billing.email,
          country: 'IN',
          stateCode: '23',
          stateName: 'MP',
        },
        taxMode: 'none',
        currency: 'INR',
        lines: [
          {
            description: 'App',
            qty: 1,
            unitPrice: amount,
            discount: 0,
            ratePercent: 0,
            ...tax,
            total: amount,
          },
        ],
        totals: { subtotal: amount, discount: 0, ...tax, total: amount },
      },
      depth: 0,
      overrideAccess: true,
    })
  }

  const orderExists = async (id: number) =>
    Boolean(
      await payload.findByID({
        collection: 'orders',
        id,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      }),
    )
  const invoicesOf = async (id: number) =>
    (
      await payload.count({
        collection: 'invoices',
        where: { order: { equals: id } },
        overrideAccess: true,
      })
    ).totalDocs

  it('counts the legal period from 1 April India time, eight years on', () => {
    expect(ordersKeptFrom(AFTER, 8).toISOString()).toBe(new Date(FIRST_KEPT).toISOString())
    expect(ordersKeptFrom(BEFORE, 8).toISOString()).toBe(
      new Date('2026-04-01T00:00:00+05:30').toISOString(),
    )
  })

  it('removes nothing until the Owner turns it on, then an order with everything on it', async () => {
    const { order, invoice } = await sale('old', '2026-06-01T10:00:00.000Z')
    const note = await document(
      'oldnote',
      'credit-note',
      order,
      '2026-07-01T10:00:00.000Z',
      invoice.id,
    )
    const file = await payload.create({
      collection: 'private-files',
      data: { purpose: 'invoice', owner: { relationTo: 'invoices', value: invoice.id } },
      file: { data: pdf, mimetype: 'application/pdf', name: `inv-${run}.pdf`, size: pdf.length },
      depth: 0,
      overrideAccess: true,
    })
    await db().execute(sql`UPDATE orders SET invoice_id = ${invoice.id} WHERE id = ${order.id}`)
    const license = await payload.create({
      collection: 'licenses',
      data: {
        product: ids.product!,
        plan: ids.plan!,
        customer: ids.customer!,
        order: order.id,
        status: 'active',
        source: 'purchase',
      },
      depth: 0,
      overrideAccess: true,
    })

    await applyRetention(AFTER)
    expect(await orderExists(order.id)).toBe(true)

    await settings({ removeOrders: true })
    await applyRetention(BEFORE)
    expect(await orderExists(order.id)).toBe(true)
    await applyRetention(AFTER)
    expect(await orderExists(order.id)).toBe(false)
    expect(await invoicesOf(order.id)).toBe(0)
    expect(
      await payload.findByID({
        collection: 'invoices',
        id: note.id,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      }),
    ).toBeNull()
    expect(await exists('private-files', file.id)).toBe(false)
    expect(telegrams.at(-1)).toMatch(/\d+ orders/)
    // The license keeps working, with no order on it.
    const kept = await payload.findByID({
      collection: 'licenses',
      id: license.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(kept).toMatchObject({ status: 'active', order: null })
  })

  it('keeps an order while a later credit note on it is inside the period', async () => {
    const { order, invoice } = await sale('refunded', '2026-06-01T10:00:00.000Z')
    await document('late', 'credit-note', order, '2027-05-01T10:00:00.000Z', invoice.id)
    await settings({ removeOrders: true })
    await applyRetention(AFTER)
    expect(await orderExists(order.id)).toBe(true)
    expect(await invoicesOf(order.id)).toBe(2)
    await applyRetention(new Date('2036-04-01T00:00:00+05:30'))
    expect(await orderExists(order.id)).toBe(false)
  })

  it('keeps an order updated inside the period', async () => {
    const { order } = await sale('touched', '2026-06-01T10:00:00.000Z')
    await db().execute(
      sql`UPDATE orders SET updated_at = '2027-05-01T10:00:00.000Z' WHERE id = ${order.id}`,
    )
    await settings({ removeOrders: true })
    await applyRetention(AFTER)
    expect(await orderExists(order.id)).toBe(true)
  })

  it('is the Owner’s setting alone', async () => {
    const read = (user: User) =>
      payload.findGlobal({ slug: 'retention-settings', overrideAccess: false, user })
    expect(await read(users.owner)).toMatchObject({
      leadMonths: 24,
      removeOrders: false,
      orderFinancialYears: 8,
    })
    await expect(read(users.support)).rejects.toThrow()
  })
})
