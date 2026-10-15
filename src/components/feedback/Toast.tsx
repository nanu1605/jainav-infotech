'use client'

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Toast as ToastPrimitive } from 'radix-ui'
import { useSyncExternalStore } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'success' | 'danger'
export type ToastOptions = { title: string; description?: string; tone?: Tone }
type Item = ToastOptions & { id: number; open: boolean }

// A tiny external store, so toast() works from any event handler or form callback.
let items: Item[] = []
let nextId = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
const update = (next: Item[]) => {
  items = next
  listeners.forEach((listener) => listener())
}
const NONE: Item[] = []

/** Shows a notification. <Toaster /> must be mounted once (root layout). */
export function toast(options: ToastOptions) {
  // Closed toasts stay until the next one so their exit animation can finish.
  update([...items.filter((item) => item.open), { ...options, id: ++nextId, open: true }])
}

const close = (id: number) =>
  update(items.map((item) => (item.id === id ? { ...item, open: false } : item)))

// Status is carried by the icon too, never by color alone.
const ICON = { neutral: Info, success: CircleCheck, danger: CircleAlert }
const ICON_COLOR = { neutral: 'text-fg-muted', success: 'text-success', danger: 'text-danger' }

// Radix keeps a closing toast mounted only while a CSS animation runs (not a transition).
const KEYFRAMES =
  '@keyframes jv-toast-in{from{opacity:0;transform:translateY(0.5rem) scale(0.98)}}' +
  '@keyframes jv-toast-out{to{opacity:0}}' +
  '@keyframes jv-toast-swipe{from{transform:translateX(var(--radix-toast-swipe-end-x))}to{transform:translateX(110%)}}'

export function Toaster() {
  const t = useTranslations('ui.toast')
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => NONE,
  )

  return (
    <ToastPrimitive.Provider label={t('label')}>
      <style href="jv-toast" precedence="default">
        {KEYFRAMES}
      </style>
      {list.map(({ id, open, title, description, tone = 'neutral' }) => {
        const Icon = ICON[tone]
        return (
          <ToastPrimitive.Root
            key={id}
            open={open}
            onOpenChange={(isOpen) => isOpen || close(id)}
            // "background" = polite announcement.
            type="background"
            className={cn(
              'pointer-events-auto grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 text-sm text-fg shadow-lg',
              'data-[state=open]:animate-[jv-toast-in_var(--duration-base)_var(--ease-out)]',
              'data-[state=closed]:animate-[jv-toast-out_var(--duration-fast)_var(--ease-out)_forwards]',
              'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
              'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[translate] data-[swipe=cancel]:duration-[var(--duration-base)]',
              'data-[state=closed]:data-[swipe=end]:animate-[jv-toast-swipe_var(--duration-base)_var(--ease-out)_forwards]',
            )}
          >
            <span className="flex h-[1lh] items-center">
              <Icon aria-hidden className={cn('size-5', ICON_COLOR[tone])} />
            </span>
            <div className="grid min-w-0 gap-1">
              <ToastPrimitive.Title className="font-semibold">{title}</ToastPrimitive.Title>
              {description && (
                <ToastPrimitive.Description className="text-fg-muted">
                  {description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close asChild>
              <IconButton label={t('close')} className="-me-2 -mt-2">
                <X aria-hidden />
              </IconButton>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
      <ToastPrimitive.Viewport
        label={t('viewport', { hotkey: 'F8' })}
        className="pointer-events-none fixed end-0 bottom-0 z-100 flex w-full flex-col gap-2 p-4 outline-none sm:max-w-sm"
      />
    </ToastPrimitive.Provider>
  )
}
