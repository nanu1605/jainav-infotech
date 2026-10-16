// Sentry's browser SDK loads once the page is idle, so it stays out of the initial JS (spec §15).
// Errors thrown before it arrives are not reported.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const load = () => {
    import('@/lib/sentry').then(
      ({ initSentry }) => initSentry(dsn),
      () => {}, // A blocked or failed download leaves the page as it is.
    )
  }
  const whenIdle = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 10_000 })
    else setTimeout(load, 3000)
  }
  if (document.readyState === 'complete') whenIdle()
  else addEventListener('load', whenIdle, { once: true })
}
