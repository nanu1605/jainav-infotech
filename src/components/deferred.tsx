'use client'

import { lazy, Suspense, type ComponentType } from 'react'

let firstPaint: Promise<void> | undefined

/**
 * Resolves once the browser has shown its first contentful frame: at once on the server, and
 * after client-side navigations. Some views never report a paint (a tab opened in the
 * background, embedded web views), so it also gives up a while after the page has loaded.
 */
function afterFirstPaint(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  firstPaint ??= new Promise<void>((resolve) => {
    if (
      performance.getEntriesByName('first-contentful-paint').length ||
      !PerformanceObserver.supportedEntryTypes?.includes('paint')
    ) {
      resolve()
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = () => {
      observer.disconnect()
      clearTimeout(timer)
      resolve()
    }
    const observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName('first-contentful-paint').length) done()
    })
    observer.observe({ type: 'paint', buffered: true })
    const giveUp = () => (timer = setTimeout(done, 2000))
    if (document.readyState === 'complete') giveUp()
    else addEventListener('load', giveUp, { once: true })
  })
  return firstPaint
}

/**
 * A component with its code split off (spec §15 budget). The server still renders it in full
 * into the HTML; in the browser that markup stays as it is until the chunk arrives and hydrates
 * it. The chunk is only requested once the page has painted, so it never competes with what the
 * first frame needs (spec §15 LCP). A failed download renders `Failed` there instead of reaching
 * the page's error boundary. `Placeholder` holds the space while the server streams the component
 * in (the first HTML can arrive before it), so a late swap shifts nothing.
 */
export function deferred<P extends object>(
  load: () => Promise<ComponentType<P>>,
  Failed: ComponentType = () => null,
  Placeholder?: ComponentType,
) {
  const Lazy = lazy(() =>
    afterFirstPaint()
      .then(load)
      .then(
        (Component) => ({ default: Component }),
        () => ({ default: Failed as ComponentType<P> }),
      ),
  )
  return function Deferred(props: P) {
    return (
      <Suspense fallback={Placeholder && <Placeholder />}>
        <Lazy {...props} />
      </Suspense>
    )
  }
}
