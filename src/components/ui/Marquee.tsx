import { Pause, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { iconButtonVariants } from './IconButton'

type Props = {
  children: ReactNode
  /** Seconds for one full loop; lower is faster. */
  speedSeconds?: number
  reverse?: boolean
  pauseOnHover?: boolean
  className?: string
}

/**
 * Continuously scrolling strip (spec §14), CSS only. The content is duplicated for a seamless loop;
 * the copy is hidden from assistive technology and can't be focused. It pauses on hover, while
 * anything inside has focus, and with the pause toggle (WCAG 2.2.2). With reduced motion it
 * doesn't move: the items wrap onto centered rows and the toggle is hidden. Give it enough items
 * to be wider than its container, or a gap shows before the loop restarts.
 */
export function Marquee({
  children,
  speedSeconds = 40,
  reverse = false,
  pauseOnHover = true,
  className,
}: Props) {
  const t = useTranslations('ui.marquee')
  const copy = 'flex shrink-0 items-center gap-x-10 gap-y-4 pr-10'

  return (
    <div className={cn('group/marquee flex items-center gap-2', className)}>
      <div className="min-w-0 flex-1 overflow-hidden mask-x-from-90% motion-reduce:mask-none">
        <div
          className={cn(
            'flex w-max animate-marquee group-focus-within/marquee:[animation-play-state:paused] group-has-checked/marquee:[animation-play-state:paused]',
            'motion-reduce:w-full motion-reduce:animate-none',
            pauseOnHover && 'group-hover/marquee:[animation-play-state:paused]',
            reverse && '[animation-direction:reverse]',
          )}
          style={{ '--marquee-duration': `${speedSeconds}s` } as CSSProperties}
        >
          <div
            className={cn(
              copy,
              'motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:pr-0',
            )}
          >
            {children}
          </div>
          <div aria-hidden inert className={cn(copy, 'motion-reduce:hidden')}>
            {children}
          </div>
        </div>
      </div>
      <label
        className={cn(
          iconButtonVariants({ variant: 'ghost', size: 'md' }),
          'cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring motion-reduce:hidden',
        )}
      >
        <input type="checkbox" aria-label={t('pause')} className="sr-only" />
        <Pause aria-hidden className="group-has-checked/marquee:hidden" />
        <Play aria-hidden className="hidden group-has-checked/marquee:block" />
      </label>
    </div>
  )
}
