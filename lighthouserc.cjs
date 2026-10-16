/**
 * Lighthouse budgets (spec §15), mobile emulation, against a running production build:
 * `pnpm build && pnpm start -p 3100`, then `pnpm lhci` (LHCI_BASE_URL points it elsewhere).
 * The spec measures English production URLs; Phase 6 points this at them in CI.
 */
const base = process.env.LHCI_BASE_URL ?? 'http://localhost:3100'

module.exports = {
  ci: {
    collect: {
      url: ['/', '/products', '/products/vyro', '/products/baby'].map((path) => base + path),
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
