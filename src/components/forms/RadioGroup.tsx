import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type RadioOption = { value: string; label: ReactNode; description?: ReactNode }

export type RadioGroupProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue' | 'children' | 'name'
> & {
  /** Shared by every radio: native arrow-key navigation needs it. */
  name: string
  options: RadioOption[]
  defaultValue?: string
}

/**
 * Native radios as selectable cards. Name the group with FormField (`group`), which passes
 * aria-labelledby/-describedby/-invalid/-required to the radiogroup; every other prop (including
 * react-hook-form's register()) goes to each radio.
 */
export function RadioGroup({
  options,
  defaultValue,
  className,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  'aria-required': required,
  ...input
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      aria-required={required}
      className={cn('grid gap-2 [&[aria-invalid=true]>label]:border-danger', className)}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex min-h-10 cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm',
            'transition-[border-color,background-color] duration-[var(--duration-fast)] ease-out hover:bg-hover',
            'has-checked:border-primary has-checked:bg-primary/5',
            'has-disabled:cursor-not-allowed has-disabled:opacity-50',
          )}
        >
          <span className="flex h-[1lh] shrink-0 items-center">
            <input
              type="radio"
              value={option.value}
              defaultChecked={
                defaultValue === undefined ? undefined : option.value === defaultValue
              }
              className="size-5 cursor-[inherit] accent-primary"
              {...input}
            />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="font-medium text-fg">{option.label}</span>
            {option.description && <span className="text-fg-muted">{option.description}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}
