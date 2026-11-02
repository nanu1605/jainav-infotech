import { getRewrittenUrl } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import proxy from '@/proxy'

const run = (path: string) => proxy(new NextRequest(`http://localhost${path}`))

describe('proxy', () => {
  it.each(['/a%b', '/%E0%A4', '/en/a%b', '/products/a%b', '/hi/a%b', '/hi/%E0%A4'])(
    'answers the undecodable %s with a 404 itself',
    (path) => {
      const response = run(path)
      expect(response.status).toBe(404)
      expect(getRewrittenUrl(response)).toBeNull()
    },
  )

  it.each([
    ['/a%25b', 'en'],
    ['/products/a%25b', 'en'],
    ['/en/a%25b', 'en'],
    ['/a%2525b', 'en'],
    ['/a%00b', 'en'],
    ['/hi/a%25b', 'hi'],
  ])('sends %s to the %s 404 page', (path, locale) => {
    expect(getRewrittenUrl(run(path))).toBe(`http://localhost/${locale}/malformed-path`)
  })

  it.each([
    ['/', 'http://localhost/en'],
    ['/products/vyro', 'http://localhost/en/products/vyro'],
    ['/nonexistent', 'http://localhost/en/nonexistent'],
    ['/a%2Fb', 'http://localhost/en/a%2Fb'],
    ['/a%20b', 'http://localhost/en/a%20b'],
    ['/hi/products/vyro', null],
    ['/hi/%E0%A4%85', null],
  ])('leaves %s to next-intl', (path, target) => {
    expect(getRewrittenUrl(run(path))).toBe(target)
  })
})
