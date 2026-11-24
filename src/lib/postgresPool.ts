/**
 * pg's pool keeps an unused connection open for 10 seconds (pg-pool's default). When Postgres closes
 * one in that time (a restart ends them all with 57P01; a reset connection gives ECONNRESET), the
 * pool discards it and emits 'error'. With no listener the emit throws, as an uncaught exception:
 * Next logs it and carries on, a script stops. Payload's Postgres adapter listens only on the one
 * connection it holds itself, so `src/payload.config.ts` adds this listener in `onInit`
 * (docs/decisions.md).
 */

/** What this needs from pg's `Pool`, which Payload's adapter creates (pg is its dependency). */
export type IdleErrorSource = { on(event: 'error', listener: (err: Error) => void): unknown }

export type IdleErrorFields = { code?: string; message: string }

const WATCHED = Symbol.for('jainav.watchIdleConnections')

/**
 * Logs an idle connection's error as a warning; the pool's next query opens a new connection. Only
 * the code and message: the error also carries the connection (`err.client`) with its settings,
 * which has no place in the logs. A second call on the same pool adds nothing.
 */
export function watchIdleConnections(
  pool: IdleErrorSource,
  warn: (fields: IdleErrorFields, msg: string) => void,
): void {
  const marked = pool as IdleErrorSource & { [WATCHED]?: true }
  if (marked[WATCHED]) return
  marked[WATCHED] = true
  pool.on('error', (err) => {
    const { code } = err as { code?: unknown }
    warn(
      typeof code === 'string' ? { code, message: err.message } : { message: err.message },
      'postgres: an idle connection closed',
    )
  })
}
