import { describe, expect, it } from 'vitest'

import { isAllowedEmbedUrl } from '@/lib/embed'

describe('isAllowedEmbedUrl', () => {
  it.each([
    'https://www.youtube-nocookie.com/embed/abc123',
    'https://www.youtube.com/embed/abc123',
    'https://player.vimeo.com/video/123',
    'https://www.loom.com/embed/abc',
    'https://cal.com/jainav/intro',
    'https://calendly.com/jainav/30min',
    'https://WWW.YOUTUBE.COM/embed/abc123',
    'https://www.youtube.com:443/embed/abc123',
  ])('allows %s', (url) => {
    expect(isAllowedEmbedUrl(url)).toBe(true)
  })

  it.each([
    ['http://www.youtube.com/embed/abc123', 'not https'],
    ['https://youtube.com/embed/abc123', 'host differs'],
    ['https://evil.cal.com/x', 'subdomain'],
    ['https://cal.com.evil.example/x', 'suffix'],
    ['https://www.youtube.com.evil.example/embed/abc123', 'suffix'],
    ['https://www.youtube.com:8443/embed/abc123', 'non-default port'],
    ['//www.youtube.com/embed/abc123', 'protocol-relative'],
    ['javascript:alert(1)', 'script URL'],
    ['data:text/html,hi', 'data URL'],
    ['not a url', 'unparseable'],
    ['', 'empty'],
  ])('rejects %s (%s)', (url) => {
    expect(isAllowedEmbedUrl(url)).toBe(false)
  })
})
