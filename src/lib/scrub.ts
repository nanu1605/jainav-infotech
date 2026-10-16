import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs'

// A URL (scheme://…) or a path ("/…") followed by its query string or fragment. Newsletter confirm
// and unsubscribe links carry their token in the query (spec §13), so no query ever leaves.
const URL_TAIL = /((?:\b[a-z][\w+.-]*:\/\/|(?<![\w./])\/)[^\s?#"'<>]*)[?#][^\s"'<>]*/gi

/** A copy of `value` with the query string and fragment cut from every URL in every string. */
function stripUrlTails<T>(value: T): T {
  if (typeof value === 'string') return value.replace(URL_TAIL, '$1') as T
  if (Array.isArray(value)) return value.map(stripUrlTails) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, stripUrlTails(item)]),
    ) as T
  }
  return value
}

/**
 * What a Sentry error event may carry (spec §16, DPDP): no user, cookies, request body, query
 * string or headers except the user agent, and no URL query or fragment anywhere.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { user: _user, request, ...rest } = stripUrlTails(event)
  if (!request) return rest
  const userAgent = Object.entries(request.headers ?? {}).find(
    ([name]) => name.toLowerCase() === 'user-agent',
  )?.[1]
  return {
    ...rest,
    request: {
      url: request.url,
      method: request.method,
      ...(userAgent && { headers: { 'User-Agent': userAgent } }),
    },
  }
}

export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => stripUrlTails(breadcrumb)
