import { ImageResponse } from 'next/og'

import { tokens } from '@/styles/tokens.generated'

export const OG_SIZE = { width: 1200, height: 630 }

const t = tokens.light

/**
 * Share image template (spec §15): page title and eyebrow on the brand surface, with an accent
 * bar in the product's color. English only: Satori can't shape Devanagari, so Hindi pages share
 * the English image (spec §6).
 */
export function ogImage({
  title,
  eyebrow,
  accent = t.primary,
}: {
  title: string
  eyebrow?: string | null
  accent?: string | null
}) {
  const color = accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : t.primary
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: t['bg-subtle'],
        color: t.fg,
        borderTop: `16px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {eyebrow && (
          <div style={{ fontSize: 32, color: t['fg-muted'], display: 'flex' }}>{eyebrow}</div>
        )}
        <div
          style={{
            fontSize: title.length > 60 ? 64 : 80,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            display: 'flex',
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 32 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: t.primary,
            color: t['primary-fg'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          J
        </div>
        <div style={{ display: 'flex', fontWeight: 600 }}>Jainav Infotech</div>
      </div>
    </div>,
    OG_SIZE,
  )
}
