'use client'

import { Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root> & { label: ReactNode }

/**
 * Radix Switch with its label. Inside a <form> it submits `name=value` like a checkbox; with
 * react-hook-form use a Controller (checked / onCheckedChange).
 */
export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label
      className={cn(
        'flex min-h-10 cursor-pointer items-center justify-between gap-4 text-sm text-fg',
        // Muted text, not opacity: axe can't tell a Radix switch's label is exempt (WCAG 1.4.3).
        'has-disabled:cursor-not-allowed has-disabled:text-fg-muted',
        className,
      )}
    >
      <span className="min-w-0">{label}</span>
      <SwitchPrimitive.Root
        className={cn(
          'inline-flex h-6 w-11 shrink-0 cursor-[inherit] items-center rounded-full bg-border-strong p-0.5 disabled:opacity-50',
          'transition-[background-color] duration-[var(--duration-fast)] ease-out data-[state=checked]:bg-primary',
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-surface shadow-sm transition-transform duration-[var(--duration-fast)] ease-out data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-fg" />
      </SwitchPrimitive.Root>
    </label>
  )
}
