'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'

type Tone = 'neutral' | 'success' | 'danger'
export type ToastOptions = { title: string; description?: string; tone?: Tone }
export type ToastItem = ToastOptions & { id: number; open: boolean }

// A tiny external store, so toast() works from any event handler or form callback.
let items: ToastItem[] = []
let nextId = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
const update = (next: ToastItem[]) => {
  items = next
  listeners.forEach((listener) => listener())
}
const NONE: ToastItem[] = []

/** Shows a notification. <Toaster /> must be mounted once (root layout). */
export function toast(options: ToastOptions) {
  // Closed toasts stay until the next one so their exit animation can finish.
  update([...items.filter((item) => item.open), { ...options, id: ++nextId, open: true }])
}

export const closeToast = (id: number) =>
  update(items.map((item) => (item.id === id ? { ...item, open: false } : item)))

// The Radix toast UI is ~25 KB gzipped: load it with the first toast, not on every page (§15).
const ToastList = dynamic(() => import('./ToastList').then((mod) => mod.ToastList), {
  ssr: false,
})

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => NONE,
  )
  return list.length > 0 ? <ToastList list={list} /> : null
}
