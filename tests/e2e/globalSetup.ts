import { execSync } from 'node:child_process'

/**
 * Public pages show published content only: seed the local database (idempotent) and publish
 * the seeded drafts (seed:publish refuses anything but a local database).
 */
export default function setup() {
  execSync('pnpm seed && pnpm seed:publish', { stdio: 'inherit' })
}
