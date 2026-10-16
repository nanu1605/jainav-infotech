'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

// Radix keeps closing content mounted only while a CSS animation runs (a transition would be cut
// off), so enter/exit are keyframes. React hoists this <style> into <head> once.
const KEYFRAMES =
  '@keyframes jv-fade-in{from{opacity:0}}' +
  '@keyframes jv-fade-out{to{opacity:0}}' +
  '@keyframes jv-pop-in{from{opacity:0;transform:scale(0.96)}}' +
  '@keyframes jv-pop-out{to{opacity:0;transform:scale(0.96)}}' +
  '@keyframes jv-slide-in{from{transform:var(--jv-slide)}}' +
  '@keyframes jv-slide-out{to{transform:var(--jv-slide)}}'

export type OverlayContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  title: ReactNode
  description?: ReactNode
}

/** Portal, overlay, labelled panel with a scrolling body and a close button; Dialog and Drawer. */
export function OverlayContent({
  title,
  description,
  className,
  children,
  ...props
}: OverlayContentProps) {
  const t = useTranslations('ui.dialog')
  return (
    <DialogPrimitive.Portal>
      <style href="jv-overlay" precedence="default">
        {KEYFRAMES}
      </style>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-[jv-fade-out_var(--duration-fast)_var(--ease-out)_forwards] data-[state=open]:animate-[jv-fade-in_var(--duration-base)_var(--ease-out)]" />
      <DialogPrimitive.Content
        // Without a description, tell Radix there is none (otherwise it warns).
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed z-50 flex flex-col border-border bg-surface-raised text-fg shadow-lg outline-none',
          className,
        )}
        {...props}
      >
        <div className="grid gap-1.5 px-6 pt-6 pe-16">
          <DialogPrimitive.Title className="font-display text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-sm text-fg-muted">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">{children}</div>
        {/* Last in the DOM so initial focus lands on the content, not on Close. */}
        <DialogPrimitive.Close asChild>
          <IconButton label={t('close')} className="absolute end-3 top-3">
            <X aria-hidden />
          </IconButton>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Centred modal. Reduced motion: opacity only. */
export function DialogContent({ className, ...props }: OverlayContentProps) {
  return (
    <OverlayContent
      className={cn(
        'inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-xl border',
        'data-[state=open]:animate-[jv-pop-in_var(--duration-base)_var(--ease-out)]',
        'data-[state=closed]:animate-[jv-pop-out_var(--duration-fast)_var(--ease-out)_forwards]',
        'motion-reduce:data-[state=open]:animate-[jv-fade-in_var(--duration-base)_var(--ease-out)]',
        'motion-reduce:data-[state=closed]:animate-[jv-fade-out_var(--duration-fast)_var(--ease-out)_forwards]',
        className,
      )}
      {...props}
    />
  )
}
