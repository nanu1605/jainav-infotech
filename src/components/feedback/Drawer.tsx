'use client'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

import {
  Dialog,
  DialogClose,
  DialogTrigger,
  OverlayContent,
  type OverlayContentProps,
} from './Dialog'

export { Dialog as Drawer, DialogClose as DrawerClose, DialogTrigger as DrawerTrigger }

// Slides with transform only (--jv-slide feeds the keyframes in Dialog.tsx); reduced motion fades.
const drawerVariants = cva(
  [
    'data-[state=open]:animate-[jv-slide-in_var(--duration-base)_var(--ease-out)]',
    'data-[state=closed]:animate-[jv-slide-out_var(--duration-fast)_var(--ease-in-out)_forwards]',
    'motion-reduce:data-[state=open]:animate-[jv-fade-in_var(--duration-base)_var(--ease-out)]',
    'motion-reduce:data-[state=closed]:animate-[jv-fade-out_var(--duration-fast)_var(--ease-out)_forwards]',
  ],
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 w-[min(28rem,calc(100%-3rem))] border-l [--jv-slide:translateX(100%)]',
        left: 'inset-y-0 left-0 w-[min(28rem,calc(100%-3rem))] border-r [--jv-slide:translateX(-100%)]',
        bottom:
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t [--jv-slide:translateY(100%)]',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

export type DrawerContentProps = OverlayContentProps & VariantProps<typeof drawerVariants>

/** Side or bottom sheet on the Dialog base (focus trap, Escape, scroll lock). */
export function DrawerContent({ side, className, ...props }: DrawerContentProps) {
  return <OverlayContent className={cn(drawerVariants({ side }), className)} {...props} />
}
