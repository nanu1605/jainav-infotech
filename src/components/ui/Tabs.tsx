'use client'

import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-6', className)} {...props} />
}

/** Scrolls sideways when the labels don't fit (long Hindi labels on phones). */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
      {...props}
    />
  )
}

/** The active tab is marked by a bar and stronger text, not by color alone. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium whitespace-nowrap text-fg-muted [&_svg]:size-4',
        'transition-colors duration-[var(--duration-fast)] hover:text-fg focus-visible:-outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-fg',
        'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary',
        'after:transition-transform after:duration-[var(--duration-base)] after:ease-out data-[state=active]:after:scale-x-100',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'rounded-md transition-opacity duration-[var(--duration-base)] ease-out starting:opacity-0',
        className,
      )}
      {...props}
    />
  )
}
