import * as Sentry from '@sentry/nextjs'

import { scrubBreadcrumb, scrubEvent } from './scrub'

/**
 * Error tracking (spec §18.4), shared by the server and the browser. Errors only: no tracing,
 * no session replay, no personal data (spec §16). SDK 11 replaced `sendDefaultPii` with
 * `dataCollection`, whose defaults collect everything; scrubEvent backs it up.
 */
export function initSentry(dsn: string) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
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
