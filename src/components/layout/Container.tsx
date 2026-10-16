import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const SIZES = {
  prose: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[96rem]',
} as const

export type ContainerProps = ComponentProps<'div'> & { size?: keyof typeof SIZES }

/** Centred page column with the site's side gutters. */
export function Container({ size = 'default', className, ...props }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', SIZES[size], className)} {...props} />
  )
}
