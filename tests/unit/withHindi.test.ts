import { describe, expect, it } from 'vitest'

import { withHindi } from '../../scripts/seed/withHindi'

describe('withHindi', () => {
  it('sends only patched top-level fields and keeps row ids and non-localized row fields', () => {
    const en = {
      id: 1,
      name: 'VYRO',
      tagline: 'Know your machine.',
      layout: [{ id: 'r1', blockType: 'hero', heading: 'Hi', link: { label: 'Go', href: '/go' } }],
    }
    expect(
      withHindi(en, { tagline: 'जानिए', layout: [{ heading: 'नमस्ते', link: { label: 'चलें' } }] }),
    ).toEqual({
      tagline: 'जानिए',
      layout: [
        { id: 'r1', blockType: 'hero', heading: 'नमस्ते', link: { label: 'चलें', href: '/go' } },
      ],
    })
  })
})
