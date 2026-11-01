import { describe, expect, it } from 'vitest'

import { placeholdersIn, withoutPlaceholders } from '@/lib/placeholders'

describe('placeholders', () => {
  it('finds each one once, wherever it sits in rich text', () => {
    const body = {
      root: {
        children: [
          { type: 'text', text: 'CIN: {{CIN}}, {{CIN}} and {{BUSINESS_DAYS}}' },
          { type: 'link', fields: { url: 'https://{{DOMAIN}}/x' } },
        ],
      },
    }
    expect(placeholdersIn(['Title', body])).toEqual(['{{CIN}}', '{{BUSINESS_DAYS}}', '{{DOMAIN}}'])
  })

  it('counts a half-typed one, and finds none in clean text or nesting', () => {
    expect(placeholdersIn('Our {{CIN is')).toEqual(['{{CIN is'])
    expect(placeholdersIn({ a: { b: { c: 'plain } } text' } } })).toEqual([])
    expect(placeholdersIn(undefined)).toEqual([])
  })

  it('sees one that formatting split across two rich text nodes', () => {
    const paragraph = {
      children: [
        { type: 'text', text: 'Say "CIN": {', format: 0 },
        { type: 'text', text: '{CIN}}', format: 1 },
      ],
    }
    expect(placeholdersIn(paragraph)).toEqual(['{{CIN}}'])
    const clean = {
      children: [{ text: 'a {', format: 0 }, { format: 1 }, { text: 'b', format: 0 }],
    }
    expect(placeholdersIn(clean)).toEqual([])
  })

  it('blanks a value still holding one and leaves the rest', () => {
    const company = {
      legalName: 'Jainav Infotech Private Limited',
      cin: '{{CIN}}',
      emails: { hello: 'hello@example.com', sales: '{{EMAIL}}' },
      offices: ['Indore', 'Bhopal {{PIN}}', 'Half-typed {{PIN'],
      founded: 2026,
      active: true,
      logo: null,
    }
    expect(withoutPlaceholders(company)).toEqual({
      legalName: 'Jainav Infotech Private Limited',
      cin: null,
      emails: { hello: 'hello@example.com', sales: null },
      offices: ['Indore', null, null],
      founded: 2026,
      active: true,
      logo: null,
    })
  })
})
