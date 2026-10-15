import { cva, type VariantProps } from 'class-variance-authority'

import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { cn } from '@/lib/cn'
import type { Media } from '@/payload-types'

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-14 text-lg',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

const PIXELS = { sm: 32, md: 40, lg: 56 } as const

/** First grapheme of each of the first two words (a Devanagari letter keeps its matra). */
function initials(name: string) {
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => graphemes.segment(word)[Symbol.iterator]().next().value?.segment ?? '')
    .join('')
    .toUpperCase()
}

export type AvatarProps = VariantProps<typeof avatarVariants> & {
  /** The person's name: the image's alt text, or the label of the initials fallback. */
  name: string
  image?: Media | string | null
  /** Hide from screen readers when the name is already visible next to the avatar. */
  decorative?: boolean
  className?: string
}

export function Avatar({ name, image, size, decorative = false, className }: AvatarProps) {
  const classes = cn(avatarVariants({ size }), className)
  if (!image) {
    const label = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name }
    return (
      <span {...label} className={cn(classes, 'bg-primary/15 text-fg')}>
        <span aria-hidden>{initials(name)}</span>
      </span>
    )
  }
  const img = { alt: name, decorative, fill: true, sizes: `${PIXELS[size ?? 'md']}px` }
  return (
    <span className={cn(classes, 'overflow-hidden bg-bg-subtle')}>
      {typeof image === 'string' ? (
        <ResponsiveImage src={image} {...img} className="object-cover" />
      ) : (
        <ResponsiveImage media={image} {...img} className="object-cover" />
      )}
    </span>
  )
}
