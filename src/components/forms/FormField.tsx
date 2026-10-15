import { CircleAlert } from 'lucide-react'
import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Label } from './Label'

type ControlProps = {
  id?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
}

export type FormFieldProps = {
  /** Omit only when the control labels itself (Checkbox, Switch). */
  label?: ReactNode
  description?: ReactNode
  /** Error message, e.g. `errors.email?.message` from react-hook-form. */
  error?: string
  required?: boolean
  /** The control is a group (RadioGroup): the label names it through aria-labelledby. */
  group?: boolean
  className?: string
  /** One control (`<Input {...register('email')} />`, or a Controller's render output). */
  children: ReactElement<ControlProps>
}

/** Label + control + description + error, wiring ids and aria-* onto the control. */
export function FormField({
  label,
  description,
  error,
  required,
  group,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {label && (
        <Label id={labelId} htmlFor={group ? undefined : id} className="mb-1.5">
          {label}
          {required && (
            <span aria-hidden className="ms-0.5 text-danger">
              *
            </span>
          )}
        </Label>
      )}
      {cloneElement(children, {
        ...(group ? { 'aria-labelledby': labelId } : { id }),
        'aria-describedby':
          [description && descriptionId, error && errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}
      {description && (
        <p id={descriptionId} className="mt-1.5 text-sm text-fg-muted">
          {description}
        </p>
      )}
      {/* Always rendered: a live region must exist before its content changes to be announced. */}
      <p id={errorId} aria-live="polite" className="text-sm text-danger">
        {error && (
          <span className="mt-1.5 flex items-start gap-1.5">
            <span className="flex h-[1lh] shrink-0 items-center">
              <CircleAlert aria-hidden className="size-4" />
            </span>
            {error}
          </span>
        )}
      </p>
    </div>
  )
}
