import * as Sentry from '@sentry/nextjs'

import { scrubBreadcrumb, scrubEvent } from './scrub'

// Staging and production images differ only in their site URL (baked in at build time).
const host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost').hostname
const environment = host.startsWith('staging.') ? 'staging' : 'production'

// None of these helps fix an error. The session record would go after every page load as soon as
// a release is set. The culture context adds the browser's language and time zone. The context
// lines read the files a stack names off the server's disk, and ours are minified anyway.
const NOT_WANTED = ['BrowserSession', 'BrowserTracing', 'ContextLines', 'CultureContext']

/**
 * Error tracking (spec §18.4), shared by the server and the browser. Errors only: no session replay
 * and no tracing. Leave `tracesSampleRate` unset: spans skip scrub.ts, and any rate, even 0, can
 * still record them. Browsers send nothing about a page load where nothing failed.
 *
 * As little personal data as we can (spec §16): an event holds an error's type, stack and filtered
 * message, the page path, the pages and requests before it, and the user agent. SDK 11 replaced
 * `sendDefaultPii` with `dataCollection`, whose defaults collect everything; scrub.ts backs it up
 * and filters text by pattern, so a name in an unforeseen message or a record number in a path can
 * still get through. Sentry sees the connection's IP address, so its project setting must not store
 * it (runbooks/monitoring.md).
 */
export function initSentry(dsn: string) {
  Sentry.init({
    dsn,
    environment,
    integrations: (defaults) => defaults.filter(({ name }) => !NOT_WANTED.includes(name)),
    tracePropagationTargets: [], // or every outgoing call gets trace headers with our public key
    sendClientReports: false, // counts of what the SDK dropped: nothing an error needs
    dataCollection: {
      userInfo: false, // also tells Sentry not to infer the IP address
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
    },
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
}
