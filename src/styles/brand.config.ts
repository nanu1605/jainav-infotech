/**
 * The only file in the repo that contains colors (spec §5.2).
 * Edit seeds or the semantic mapping, then run `pnpm tokens:build`.
 *
 * Semantic values reference a primitive step ('neutral.0', 'brand.600'),
 * optionally with alpha ({ ref, alpha }). Effects are raw CSS that may use
 * primitive variables (var(--brand-500)) but no color literals.
 */

export type ScaleName =
  'brand' | 'brandAccent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
export type ColorRef = `${ScaleName}.${number}` | { ref: `${ScaleName}.${number}`; alpha: number }

export const semanticColorNames = [
  'bg',
  'bg-subtle',
  'surface',
  'surface-raised',
  'overlay',
  'hover',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-inverse',
  'border',
  'border-strong',
  'ring',
  'primary',
  'primary-hover',
  'primary-fg',
  'brand-accent',
  'brand-accent-fg',
  'success',
  'success-fg',
  'warning',
  'warning-fg',
  'danger',
  'danger-fg',
  'info',
  'info-fg',
  'glow',
] as const
export type SemanticColor = (typeof semanticColorNames)[number]

type ThemeMapping = {
  colors: Record<SemanticColor, ColorRef>
  /** Base color for --shadow-* (mixed with transparent at the strengths below). */
  shadowColor: ColorRef
  gradients: [string, string, string]
}

export const brandConfig = {
  seeds: {
    // Placeholder seeds until the logo arrives (spec §5.2).
    brand: 'oklch(0.55 0.22 275)', // electric indigo
    brandAccent: 'oklch(0.78 0.14 195)', // cyan
    neutral: 'oklch(0.55 0.015 265)', // cool neutral tint (hue + chroma are used)
    success: 'oklch(0.6 0.16 150)',
    warning: 'oklch(0.75 0.16 75)',
    danger: 'oklch(0.58 0.21 27)',
    info: 'oklch(0.6 0.15 245)',
  } satisfies Record<ScaleName, string>,

  light: {
    colors: {
      bg: 'neutral.0',
      'bg-subtle': 'neutral.50',
      surface: 'neutral.0',
      'surface-raised': 'neutral.0',
      overlay: { ref: 'neutral.1000', alpha: 0.5 },
      hover: 'neutral.100',
      fg: 'neutral.950',
      'fg-muted': 'neutral.600',
      'fg-subtle': 'neutral.500',
      'fg-inverse': 'neutral.0',
      border: 'neutral.200',
      'border-strong': 'neutral.500',
      ring: 'brand.500',
      primary: 'brand.600',
      'primary-hover': 'brand.700',
      'primary-fg': 'neutral.0',
      'brand-accent': 'brandAccent.500',
      'brand-accent-fg': 'neutral.1000',
      success: 'success.600',
      'success-fg': 'neutral.0',
      warning: 'warning.400',
      'warning-fg': 'neutral.1000',
      danger: 'danger.600',
      'danger-fg': 'neutral.0',
      info: 'info.600',
      'info-fg': 'neutral.0',
      glow: { ref: 'brand.500', alpha: 0.35 },
    },
    shadowColor: 'neutral.1000',
    gradients: [
      'linear-gradient(135deg, var(--brand-500), var(--brand-accent-400))',
      'radial-gradient(circle at 30% 20%, var(--brand-200), transparent 60%)',
      'linear-gradient(180deg, var(--neutral-0), var(--neutral-50))',
    ],
  },

  dark: {
    colors: {
      bg: 'neutral.1000',
      'bg-subtle': 'neutral.950',
      surface: 'neutral.950',
      'surface-raised': 'neutral.900',
      overlay: { ref: 'neutral.1000', alpha: 0.7 },
      hover: 'neutral.800',
      fg: 'neutral.50',
      'fg-muted': 'neutral.300',
      'fg-subtle': 'neutral.400',
      'fg-inverse': 'neutral.1000',
      border: 'neutral.800',
      'border-strong': 'neutral.500',
      ring: 'brand.400',
      primary: 'brand.400',
      'primary-hover': 'brand.300',
      'primary-fg': 'neutral.1000',
      'brand-accent': 'brandAccent.400',
      'brand-accent-fg': 'neutral.1000',
      success: 'success.400',
      'success-fg': 'neutral.1000',
      warning: 'warning.400',
      'warning-fg': 'neutral.1000',
      danger: 'danger.400',
      'danger-fg': 'neutral.1000',
      info: 'info.400',
      'info-fg': 'neutral.1000',
      glow: { ref: 'brand.400', alpha: 0.45 },
    },
    shadowColor: 'neutral.1000',
    gradients: [
      'linear-gradient(135deg, var(--brand-400), var(--brand-accent-300))',
      'radial-gradient(circle at 30% 20%, var(--brand-900), transparent 60%)',
      'linear-gradient(180deg, var(--neutral-1000), var(--neutral-950))',
    ],
  },

  /** Shadow geometry; strength = % of shadowColor mixed with transparent. Dark needs more. */
  shadows: {
    sm: { geometry: '0 1px 2px', light: 6, dark: 40 },
    md: { geometry: '0 4px 12px -2px', light: 10, dark: 50 },
    lg: { geometry: '0 16px 40px -8px', light: 16, dark: 60 },
  },

  radius: { sm: '0.375rem', md: '0.625rem', lg: '1rem', xl: '1.5rem' },
  motion: {
    'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
    'duration-fast': '150ms',
    'duration-base': '250ms',
    'duration-slow': '600ms',
  },
} satisfies BrandConfig

export type BrandConfig = {
  seeds: Record<ScaleName, string>
  light: ThemeMapping
  dark: ThemeMapping
  shadows: Record<'sm' | 'md' | 'lg', { geometry: string; light: number; dark: number }>
  radius: Record<'sm' | 'md' | 'lg' | 'xl', string>
  motion: Record<string, string>
}
