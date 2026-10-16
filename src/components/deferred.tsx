'use client'

import { lazy, Suspense, type ComponentType } from 'react'

/**
 * A component with its code split off (spec §15 budget). The server still renders it in full
 * into the HTML; in the browser that markup stays as it is until the chunk arrives and hydrates
 * it. A failed download renders `Failed` there instead of reaching the page's error boundary.
 * `Placeholder` holds the space while the server streams the component in (the first HTML can
 * arrive before it), so a late swap shifts nothing.
 */
export function deferred<P extends object>(
  load: () => Promise<ComponentType<P>>,
  Failed: ComponentType = () => null,
  Placeholder?: ComponentType,
) {
  const Lazy = lazy(() =>
    load().then(
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
