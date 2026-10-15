import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  Config,
  PayloadRequest,
  Plugin,
} from 'payload'

/**
 * For draft-enabled collections, Payload hands afterChange the latest *version* as previousDoc,
 * which may be an unpublished draft. Revalidation and the audit log need what was actually live
 * before the write, and whether the write only saved a draft (the live row is then untouched).
 * This plugin records both in req.context; read them with `liveBefore` and `isDraftWrite`.
 */

type LiveDoc = { _status?: 'draft' | 'published' | null; slug?: string | null } & Record<
  string,
  unknown
>

const liveKey = (collection: string, id: number | string) => `liveDoc:${collection}:${id}`
const draftKey = (collection: string) => `draftWrite:${collection}`

const recordDraftFlag: CollectionBeforeOperationHook = ({ args, collection, operation, req }) => {
  if (operation === 'create' || operation === 'update') {
    req.context[draftKey(collection.slug)] = (args as { draft?: boolean }).draft === true
  }
  return args
}

const captureLiveRow: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'update' && originalDoc?.id != null) {
    // db.findOne reads the main (live) row directly: no hooks, no access, same transaction.
    req.context[liveKey(collection.slug, originalDoc.id)] =
      (await req.payload.db.findOne({
        collection: collection.slug,
        where: { id: { equals: originalDoc.id } },
        req,
      })) ?? null
  }
  return data
}

/** The live row before this write; undefined when not captured (create, non-draft collections). */
export const liveBefore = (req: PayloadRequest, collection: string, id: number | string) =>
  req.context[liveKey(collection, id)] as LiveDoc | null | undefined

/** True when the current write only saved a draft version, leaving the live row as it was. */
export const isDraftWrite = (req: PayloadRequest, collection: string) =>
  req.context[draftKey(collection)] === true

export const liveDocPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((c) =>
    c.versions && typeof c.versions === 'object' && c.versions.drafts
      ? {
          ...c,
          hooks: {
            ...c.hooks,
            beforeOperation: [...(c.hooks?.beforeOperation ?? []), recordDraftFlag],
            beforeChange: [...(c.hooks?.beforeChange ?? []), captureLiveRow],
          },
        }
      : c,
  ),
})
