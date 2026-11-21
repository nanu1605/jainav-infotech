import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@/lib/sentry', () => ({ BROWSER_TUNNEL: '/api/v1/relay', initSentry: vi.fn() }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('starts the browser SDK with the same-origin relay once the page is idle', async () => {
  const dsn = 'https://key@example.test/1'
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', dsn)
  vi.stubGlobal('document', { readyState: 'complete' })
  vi.stubGlobal('requestIdleCallback', (run: () => void) => run())
  vi.stubGlobal('window', globalThis)
  // importActual: TypeScript reads the file as a script, not a module, so import() won't type-check.
  await vi.importActual('@/instrumentation-client')
  const { initSentry } = await import('@/lib/sentry')
  await vi.waitFor(() => expect(initSentry).toHaveBeenCalledWith(dsn, { tunnel: '/api/v1/relay' }))
})
