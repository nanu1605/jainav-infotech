import { describe, expect, it } from 'vitest'

import { jsonLd, localizedPath, pageMetadata, sitemapEntries, SITE_URL } from '@/lib/seo'

describe('localizedPath', () => {
  it('leaves English unprefixed and puts Hindi under /hi', () => {
    expect(localizedPath('en', '/')).toBe('/')
    expect(localizedPath('hi', '/')).toBe('/hi')
    expect(localizedPath('hi', '/products/vyro')).toBe('/hi/products/vyro')
  })
})

describe('pageMetadata (spec §6)', () => {
  const base = { path: '/products/vyro', title: 'VYRO' }

  it('pairs ready pages through hreflang with an English x-default', () => {
    const meta = pageMetadata({ ...base, locale: 'hi', hiStatus: 'ready' })
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/hi/products/vyro`)
    expect(meta.alternates?.languages).toEqual({
      en: `${SITE_URL}/products/vyro`,
      hi: `${SITE_URL}/hi/products/vyro`,
      'x-default': `${SITE_URL}/products/vyro`,
    })
    expect(meta.robots).toBeUndefined()
  })

  it.each(['missing', 'draft'] as const)(
    'Hindi %s: self canonical, no hreflang, Hindi noindex',
    (hiStatus) => {
      const hi = pageMetadata({ ...base, locale: 'hi', hiStatus })
      expect(hi.alternates?.canonical).toBe(`${SITE_URL}/hi/products/vyro`)
      expect(hi.alternates?.languages).toBeUndefined()
      expect(hi.robots).toEqual({ index: false, follow: true })
      const en = pageMetadata({ ...base, locale: 'en', hiStatus })
      expect(en.alternates?.languages).toBeUndefined()
      expect(en.robots).toBeUndefined()
    },
  )

  it('uses the SEO title as-is, bypassing the title template', () => {
    const meta = pageMetadata({ ...base, locale: 'en', seo: { title: 'VYRO | Jainav Infotech' } })
    expect(meta.title).toEqual({ absolute: 'VYRO | Jainav Infotech' })
  })
})

describe('sitemapEntries', () => {
  it('lists Hindi only for ready pages', () => {
    expect(sitemapEntries('/about', { hiStatus: 'missing' }).map((e) => e.url)).toEqual([
      `${SITE_URL}/about`,
    ])
    const ready = sitemapEntries('/about')
    expect(ready.map((e) => e.url)).toEqual([`${SITE_URL}/about`, `${SITE_URL}/hi/about`])
    expect(ready[1]?.alternates?.languages).toMatchObject({ 'x-default': `${SITE_URL}/about` })
  })
})

describe('jsonLd', () => {
  it('cannot close the script tag', () => {
    expect(jsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})
