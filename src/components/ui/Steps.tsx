import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type Step = { title: ReactNode; description?: ReactNode }

/**
 * Numbered process (e.g. Discover → Design → Build → Support). Vertical on narrow containers,
 * horizontal once the container is 48rem wide (a container query, so it also works in sidebars).
 */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <div className={cn('@container', className)}>
      <ol className="grid gap-8 @3xl:auto-cols-fr @3xl:grid-flow-col">
        {steps.map((step, i) => (
          <li
            // Steps are static content without ids; their order is their identity.
            key={i}
            className={cn(
              'relative flex gap-4 @3xl:flex-col',
              // Connector to the next step: down on narrow containers, across on wide ones.
              'before:absolute before:start-5 before:top-12 before:-bottom-6 before:w-px before:bg-border last:before:hidden',
              '@3xl:before:start-14 @3xl:before:-end-6 @3xl:before:top-5 @3xl:before:bottom-auto @3xl:before:h-px @3xl:before:w-auto',
            )}
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-display font-semibold text-fg tabular-nums"
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-1.5 @3xl:pt-0">
              <h3 className="font-display text-lg leading-snug font-semibold text-fg">
                {step.title}
              </h3>
              {step.description && <p className="mt-1 text-sm text-fg-muted">{step.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
