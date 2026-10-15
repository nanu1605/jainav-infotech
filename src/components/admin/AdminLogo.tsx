import { tokens } from '@/styles/tokens.generated'

/** Placeholder admin branding until the brand kit arrives (spec §10, Appendix B). */
export function AdminLogo() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      <Monogram size={40} />
      Jainav Infotech
    </span>
  )
}

export function Monogram({ size = 24 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size / 4,
        background: tokens.light.primary,
        color: tokens.light['primary-fg'],
        fontWeight: 700,
        fontSize: size * 0.55,
        lineHeight: 1,
      }}
    >
      J
    </span>
  )
}
