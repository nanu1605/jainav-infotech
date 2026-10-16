import { icons } from 'lucide-react'

import { cn } from '@/lib/cn'

const pascal = (name: string) =>
  name.replace(/(^|[-_ ]+)([a-z0-9])/gi, (_, __, c: string) => c.toUpperCase())

/**
 * Lucide icon by the kebab-case name editors type ("shield-check"). Server only: the full icon
 * map stays out of the client bundle. Unknown names render nothing.
 */
export function Icon({ name, className }: { name?: string | null; className?: string }) {
  const Glyph = name ? icons[pascal(name.trim()) as keyof typeof icons] : undefined
  return Glyph ? <Glyph aria-hidden className={cn('size-6', className)} /> : null
}
