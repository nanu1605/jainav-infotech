'use client'

import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactElement, ReactNode } from 'react'

/**
 * Hint shown on hover and on keyboard focus. Touch screens never show it, so it must repeat
 * information that is available elsewhere (a visible label or the control's accessible name).
 * `children` must be one focusable element (Button, IconButton, link).
 */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            collisionPadding={8}
            className="z-50 max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-md bg-fg px-2.5 py-1.5 text-sm text-fg-inverse shadow-md transition-[opacity,scale] duration-[var(--duration-fast)] ease-out starting:scale-95 starting:opacity-0"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-fg" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
