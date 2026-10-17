import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Config,
  GlobalAfterChangeHook,
  PayloadRequest,
  Plugin,
} from 'payload'

import { isDraftWrite, liveBefore } from './liveDoc'

/**
 * Collections whose writes are not audited: the log itself, high-volume counters, sign-in
 * plumbing, raw webhooks and the job queue. Store records keep their own event history.
 */
const SKIP = new Set([
  'audit-log',
  'daily-stats',
  'otp-challenges',
  'customer-sessions',
  'invoice-counters',
  'webhook-events',
  'payload-jobs',
  'trials',
])

/**
 * Their titles are personal data (emails, a customer's name). The log can't be edited or deleted,
 * so it must not hold them, or erasure requests could never be completed (spec §3, §16).
 * The id is enough. Team names are public staff bios and stay.
 */
const PERSONAL = new Set([
  'leads',
  'data-requests',
  'private-files',
  'users',
  'testimonials',
  'customers',
  'activations',
])

type Entry = {
  action: 'create' | 'update' | 'delete'
  entity: string
  docId: string
  summary: string
}

// Pass `req` so the entry commits or rolls back with the write it describes. No `depth` or
// `context`: both would be merged into the outer request and leak into later hooks.
const record = (req: PayloadRequest, entry: Entry) =>
  req.payload.create({
    collection: 'audit-log',
    data: { ...entry, actor: req.user?.id ?? null, actorEmail: req.user?.email ?? null },
    overrideAccess: true,
    req,
  })

type Status = 'draft' | 'published' | null | undefined

/** Publishing state as the public sees it: a draft save never changes it. */
const describeStatus = (draftWrite: boolean, before: Status, after: Status) => {
  if (!after) return ''
  if (draftWrite) return ' [draft saved]'
  return before !== after ? ` [${before ?? 'new'} → ${after}]` : ` [${after}]`
}

const afterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (SKIP.has(collection.slug)) return
  const titleField = collection.admin?.useAsTitle
  const title =
    !PERSONAL.has(collection.slug) && titleField && titleField !== 'id'
      ? doc[titleField]
      : undefined
  const live = liveBefore(req, collection.slug, doc.id)
  const before = (live === undefined ? previousDoc?._status : live?._status) as Status
  const status = describeStatus(isDraftWrite(req, collection.slug), before, doc._status as Status)
  await record(req, {
    action: operation,
    entity: collection.slug,
    docId: String(doc.id),
    summary: `${operation} ${collection.slug} #${doc.id}${title ? ` "${String(title).slice(0, 80)}"` : ''}${status}`,
  })
}

const afterDelete: CollectionAfterDeleteHook = async ({ collection, id, req }) => {
  if (SKIP.has(collection.slug)) return
  await record(req, {
    action: 'delete',
    entity: collection.slug,
    docId: String(id),
    summary: `delete ${collection.slug} #${id}`,
  })
}

const afterGlobalChange: GlobalAfterChangeHook = async ({ global, req }) => {
  await record(req, {
    action: 'update',
    entity: `global:${global.slug}`,
    docId: global.slug,
    summary: `update global ${global.slug}`,
  })
}

/**
 * Appends audit hooks to every collection and global (spec §9.1 auditLog). Register it LAST in
 * `plugins` so collections added by other plugins (redirects) are covered too. Hooks return
 * nothing on purpose: a truthy afterChange return would replace the operation result.
 */
export const auditPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((c) =>
    SKIP.has(c.slug)
      ? c
      : {
          ...c,
          hooks: {
            ...c.hooks,
            afterChange: [...(c.hooks?.afterChange ?? []), afterChange],
            afterDelete: [...(c.hooks?.afterDelete ?? []), afterDelete],
          },
        },
  ),
  globals: config.globals?.map((g) => ({
    ...g,
    hooks: { ...g.hooks, afterChange: [...(g.hooks?.afterChange ?? []), afterGlobalChange] },
  })),
})
