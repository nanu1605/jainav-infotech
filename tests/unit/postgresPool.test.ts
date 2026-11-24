import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { watchIdleConnections } from '@/lib/postgresPool'

/** What pg's pool emits when Postgres ends an idle connection: the error carries the connection. */
const shutdown = () =>
  Object.assign(new Error('terminating connection due to administrator command'), {
    code: '57P01',
    client: { connectionParameters: { user: 'app', database: 'jainav' }, secretKey: 1234 },
  })

describe('watchIdleConnections', () => {
  it('turns the error event into a warning with only the code and message', () => {
    const pool = new EventEmitter()
    const warn = vi.fn()
    watchIdleConnections(pool, warn)
    const err = shutdown()
    expect(() => pool.emit('error', err, err.client)).not.toThrow()
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      { code: '57P01', message: 'terminating connection due to administrator command' },
      'postgres: an idle connection closed',
    )
  })

  it('adds one listener however often it runs', () => {
    const pool = new EventEmitter()
    const warn = vi.fn()
    watchIdleConnections(pool, warn)
    watchIdleConnections(pool, warn)
    expect(pool.listenerCount('error')).toBe(1)
    pool.emit('error', shutdown())
    expect(warn).toHaveBeenCalledOnce()
  })

  it('leaves out a code that is not a string', () => {
    const pool = new EventEmitter()
    const warn = vi.fn()
    watchIdleConnections(pool, warn)
    pool.emit('error', Object.assign(new Error('Connection terminated unexpectedly'), { code: 1 }))
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      { message: 'Connection terminated unexpectedly' },
      'postgres: an idle connection closed',
    )
  })
})
