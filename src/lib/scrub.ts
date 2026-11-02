import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs'

const FILTERED = '[Filtered]'
// Longer than any real message. A longer string goes whole: a cut could take away what a rule looks
// for, such as the quote that closes a value, and the URL rule's cost grows with length.
const MAX_LENGTH = 16_384

/**
 * What no string in a Sentry event may hold, in the order the rules apply. The URL rules go last:
 * cutting a query could otherwise take away what an earlier rule looks for.
 */
const RULES: [RegExp, string][] = [
  // Drizzle's error message is the whole query followed by every bound value.
  [/Failed query: [\s\S]*/g, `Failed query: ${FILTERED}`],
  // Postgres quotes the value it refused and escapes nothing inside it: `invalid input syntax for
  // type integer: "…"`, `value "…" is out of range`. Names of tables and constraints stay.
  [/(: |\bvalue )"[\s\S]*"/g, `$1${FILTERED}`],
  // Tokens in URL paths: Telegram's API (/bot<id>:<secret>/sendMessage) and Payload's password
  // reset link (/admin/reset/<token>).
  [/\bbot\d+:[\w-]+/g, `bot${FILTERED}`],
  [/(\/reset\/)[\w-]+/g, `$1${FILTERED}`],
  // A domain's labels have no underscore and it ends in letters, so `pg@8.16.3` and Turbopack's
  // `0_@payloadcms_ui_x._.js` in a stack frame's path stay.
  [/(?<![\w.+-])[\w.+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi, FILTERED],
  // Ten to fifteen digits, with the separators people type. A time's colon rules out a date and
  // time; the length rules out a span id, and the hyphen before it or a UUID's tail after it rules
  // out a debug id.
  [
    /(?<![\w.-])\+?\d(?:[\s()-]{0,3}\d){9,14}(?!\w|:\d|(?:-[\da-f]{4}){2}-[\da-f]{12}\b)/g,
    FILTERED,
  ],
  // A URL (scheme://…) or a path ("/…") followed by its query string or fragment. Newsletter confirm
  // and unsubscribe links carry their token in the query (spec §13), so no query ever leaves.
  [/((?:\b[a-z][\w+.-]*:\/\/|(?<![\w./])\/)[^\s?#"'<>]*)[?#][^\s"'<>]*/gi, '$1'],
  // A query string on its own, e.g. an error message quoting "?token=…" without its URL.
  [/[?#][^\s"'<>]*[=&][^\s"'<>]*/g, ''],
]

/**
 * How a stack frame's path starts. The SDK parses an error's stack, which starts with its message,
 * so a line of the message holding " at " arrives as a frame, with the text after it as its path.
 */
const LOCATION = /^(?:\/|<anonymous>$|node:|[a-z][\w+.-]*:\/|[a-z]:\\)/i

/** A copy of `value` with `change` applied to every string in it. */
export function mapStrings<T>(value: T, change: (text: string) => string | null): T {
  if (typeof value === 'string') return change(value) as T
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, change)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, change)]),
    ) as T
  }
  return value
}

const scrubStrings = <T>(value: T): T =>
  mapStrings(value, (text) =>
    text.length > MAX_LENGTH
      ? FILTERED
      : RULES.reduce((out, [rule, to]) => out.replace(rule, to), text),
  )

/**
 * What a breadcrumb may carry: navigation and requests, not console lines (whatever was logged),
 * clicks (elements named by their labels) or earlier errors (each went as its own event). An
 * absolute URL keeps only its host, because the path of an outgoing call can hold a secret or a
 * file name. The site's own relative requests keep their path, without the query.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (/^(console$|ui\.|sentry\.)/.test(breadcrumb.category ?? '')) return null
  const scrubbed = scrubStrings(breadcrumb)
  const url: unknown = scrubbed.data?.url
  if (typeof url !== 'string') return scrubbed
  return {
    ...scrubbed,
    data: {
      ...scrubbed.data,
      url: url.replace(/^([a-z][\w+.-]*:\/\/[^/]+).*$/i, '$1'),
      // These hold a query and a fragment with no "?" or "#" for the rules to find.
      'url.query': undefined,
      'url.fragment': undefined,
    },
  }
}

/**
 * What a Sentry error event may carry (spec §16, DPDP): no user, cookies, request body, query
 * string or headers except the user agent, no URL query or fragment anywhere, and nothing RULES
 * recognises in any text. `extra` goes too: it holds a thrown object's fields.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { user: _user, extra: _extra, request, breadcrumbs, ...rest } = scrubStrings(event)
  for (const { stacktrace } of rest.exception?.values ?? []) {
    if (stacktrace?.frames) {
      stacktrace.frames = stacktrace.frames.filter(({ filename }) => LOCATION.test(filename ?? ''))
    }
  }
  const scrubbed: ErrorEvent = {
    ...rest,
    ...(breadcrumbs && { breadcrumbs: breadcrumbs.flatMap((b) => scrubBreadcrumb(b) ?? []) }),
  }
  if (!request) return scrubbed
  const userAgent = Object.entries(request.headers ?? {}).find(
    ([name]) => name.toLowerCase() === 'user-agent',
  )?.[1]
  return {
    ...scrubbed,
    request: {
      url: request.url,
      method: request.method,
      ...(userAgent && { headers: { 'User-Agent': userAgent } }),
    },
  }
}
