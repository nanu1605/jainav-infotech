import type { SVGProps } from 'react'

import { logoMark } from './logo-mark.generated'

type Props = Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'> & {
  /** In px; the width follows the mark's proportions. */
  height: number
}

/**
 * The Jainav mark (spec Appendix B), drawn inline from public/brand/logo-mark.svg through
 * `pnpm brand:assets`. It takes the text colour, so it follows the theme the way the supplied
 * black and white files do: ink on light surfaces, paper on dark ones. Decorative: the name sits
 * beside it everywhere but the admin nav, where Payload's home link has a "Dashboard" title.
 */
export function LogoMark({ height, ...props }: Props) {
  return (
    <svg
      width={Math.round((height * logoMark.width * 100) / logoMark.height) / 100}
      height={height}
      viewBox={`0 0 ${logoMark.width} ${logoMark.height}`}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {logoMark.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
