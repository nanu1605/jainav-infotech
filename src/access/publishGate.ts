import { Forbidden, type Access, type CollectionBeforeOperationHook } from 'payload'

import { hasRole } from './roles'

/**
 * Owner-only publishing for releases and legal pages (spec §9.3, §10).
 * Two layers, both needed:
 * - `draftsUnlessOwner` (create/update access): hides Publish/Unpublish in the admin and
 *   rejects any write whose body sets `_status: 'published'`.
 * - `ownerPublishesOnly` (beforeOperation): a non-owner may only save drafts. Any write that
 *   would touch the live row (no `draft` flag, unpublish, per-locale publish) is rejected,
 *   because Payload writes the main row whenever `draft` is not set, even without `_status`.
 */
export const draftsUnlessOwner: Access = ({ req: { user }, data }) => {
  if (hasRole(user, 'owner')) return true
  if (!hasRole(user, 'editor')) return false
  return data?._status !== 'published'
}

export const ownerPublishesOnly: CollectionBeforeOperationHook = ({
  args,
  operation,
  overrideAccess,
  req,
}) => {
  if (overrideAccess || hasRole(req.user, 'owner')) return args
  if (operation === 'create' || operation === 'update' || operation === 'restoreVersion') {
    const a = args as {
      data?: { _status?: unknown }
      draft?: boolean
      publishAllLocales?: boolean
      publishSpecificLocale?: string
      unpublishAllLocales?: boolean
    }
    const draftOnly =
      a.draft === true &&
      a.data?._status !== 'published' &&
      !a.publishAllLocales &&
      !a.publishSpecificLocale &&
      !a.unpublishAllLocales
    if (!draftOnly) throw new Forbidden(req.t)
  }
  return args
}
