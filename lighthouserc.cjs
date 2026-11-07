/**
 * Lighthouse budgets (spec §15), mobile emulation, against a running production build:
 * `pnpm build && pnpm start -p 3100`, then `pnpm lhci` (LHCI_BASE_URL points it elsewhere).
 * The spec measures English production URLs; Phase 6 points this at them in CI.
 * LCP is judged there only: `next start` serves HTTP/1.1, where Lighthouse's simulation can't
 * reach 2.5 s with React and Next.js on the page, so a local run warns on it (docs/decisions.md,
 * "LCP budget").
 */
const base = process.env.LHCI_BASE_URL ?? 'http://localhost:3100'
const local = ['localhost', '127.0.0.1'].includes(new URL(base).hostname)

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
        'largest-contentful-paint': [local ? 'warn' : 'error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
