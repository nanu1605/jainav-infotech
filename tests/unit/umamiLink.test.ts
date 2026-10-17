import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The admin's Umami link (spec §10 Insights): reads NEXT_PUBLIC_UMAMI_URL when loaded. */
const render = async () => {
  vi.resetModules()
  const { UmamiLink } = await import('@/components/admin/StatsInsights')
  return renderToStaticMarkup(createElement(UmamiLink))
}

describe('UmamiLink', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('links to Umami once it is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_URL', 'https://analytics.example.test')
    expect(await render()).toBe(
      '<a href="https://analytics.example.test" target="_blank" rel="noreferrer">Open Umami</a>',
    )
  })

  it('says so while it is not', async () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_URL', '')
    expect(await render()).toBe('Umami is not configured.')
  })
})
