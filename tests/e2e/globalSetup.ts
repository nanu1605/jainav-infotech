import { execSync } from 'node:child_process'

/**
 * Public pages show published content only: seed the local database (idempotent) and publish the
 * seeded drafts. seed:store then adds the Sample App, the published hosted product with a
 * stand-in price that the store, licensing, refund and hosted sub-page tests use, and gives paid
 * plans without a price the stand-in one (seed:publish and seed:store refuse anything but a local
 * database).
 */
export default function setup() {
  execSync('pnpm seed && pnpm seed:publish && pnpm seed:store', { stdio: 'inherit' })
}
