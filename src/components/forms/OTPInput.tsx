'use client'

import { useState, type ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const LENGTH = 6

export type OTPInputProps = Omit<ComponentProps<'input'>, 'type' | 'maxLength' | 'size'>

/**
 * One real <input> drawn as six slots, so autofill (`one-time-code`), paste, screen readers,
 * register() and Controller all see a single field. The digits are the input's own text, spaced
 * onto the slots with letter-spacing: only the highlighted slot is React state.
 */
export function OTPInput({
  className,
  onChange,
  onPaste,
  onFocus,
  onSelect,
  onBlur,
  ...props
}: OTPInputProps) {
  const [active, setActive] = useState<number | null>(null)
  const track = (input: HTMLInputElement) =>
    setActive(Math.min(input.selectionStart ?? 0, LENGTH - 1))

  return (
    <div
      className={cn(
        'group @container relative w-full max-w-[20.5rem] overflow-hidden',
        // Slot width follows the available space (narrow phones) up to 3rem.
        '[--gap:0.5rem] [--slot:calc((100cqw_-_5_*_var(--gap))_/_6)]',
        className,
      )}
    >
      <div aria-hidden className="flex gap-(--gap)">
        {Array.from({ length: LENGTH }, (_, i) => (
          <span
            key={i}
            data-active={active === i || undefined}
            className={cn(
              'h-[calc(var(--slot)*1.2)] w-(--slot) rounded-md border border-border-strong bg-surface shadow-sm',
              'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-out',
              'group-has-[[aria-invalid=true]]:border-danger group-has-disabled:bg-bg-subtle group-has-disabled:opacity-50',
              'data-active:border-ring data-active:ring-1 data-active:ring-ring data-active:ring-inset',
            )}
          />
        ))}
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={LENGTH}
        spellCheck={false}
        // The highlighted slot is the focus indicator (the outline would be clipped).
        className={cn(
          'absolute inset-y-0 start-0 w-[calc(100%+var(--slot))] bg-transparent font-mono text-2xl font-semibold text-fg caret-primary outline-none',
          'ps-[calc((var(--slot)-1ch)/2)] tracking-[calc(var(--slot)+var(--gap)-1ch)]',
          'disabled:cursor-not-allowed',
        )}
        onChange={(e) => {
          e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '')
          onChange?.(e)
        }}
        onPaste={(e) => {
          onPaste?.(e)
          const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
          if (e.defaultPrevented || !digits) return
          // "123 456" would be cut to "123 45" by maxLength: insert the digits ourselves, through
          // the native setter so React and react-hook-form receive a normal change event.
          e.preventDefault()
          const input = e.currentTarget
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
            input,
            digits,
          )
          input.dispatchEvent(new Event('input', { bubbles: true }))
        }}
        onFocus={(e) => {
          track(e.currentTarget)
          onFocus?.(e)
        }}
        onSelect={(e) => {
          track(e.currentTarget)
          onSelect?.(e)
        }}
        onBlur={(e) => {
          setActive(null)
          onBlur?.(e)
        }}
        {...props}
      />
    </div>
  )
}
