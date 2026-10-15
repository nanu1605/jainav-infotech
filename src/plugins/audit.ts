import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Config,
  GlobalAfterChangeHook,
  PayloadRequest,
  Plugin,
} from 'payload'

/** Collections whose writes are not audited: the log itself and high-volume counters. */
const SKIP = new Set(['audit-log', 'daily-stats'])

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
    data: { ...entry, actor: req.user?.id ?? null },
    req,
  })

const isAutosave = (req: PayloadRequest) => String(req.query?.autosave) === 'true'

const afterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (SKIP.has(collection.slug) || isAutosave(req)) return
  const titleField = collection.admin?.useAsTitle
  const title = titleField && titleField !== 'id' ? doc[titleField] : undefined
  const from = previousDoc?._status
  const status =
    doc._status && from !== doc._status
      ? ` [${from ?? 'new'} → ${doc._status}]`
      : doc._status
        ? ` [${doc._status}]`
        : ''
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
  if (isAutosave(req)) return
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
