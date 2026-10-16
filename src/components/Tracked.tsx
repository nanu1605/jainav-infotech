import type { ReactNode } from 'react'

/**
 * Umami click tracking for links (spec §17). Umami's tracker cancels clicks on a tracked <a>
 * and reloads the page once its request finishes, which breaks client-side navigation; on a
 * wrapper element it only records the click. `display: contents` keeps the layout unchanged.
 */
export function Tracked({
  event,
  data = {},
  children,
}: {
  event: string
  data?: Record<string, string>
  children: ReactNode
}) {
  const attributes = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [`data-umami-event-${key}`, value]),
  )
  return (
    <span className="contents" data-umami-event={event} {...attributes}>
      {children}
    </span>
  )
}
