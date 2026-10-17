import { execSync } from 'node:child_process'

/**
 * Public pages show published content only: seed the local database (idempotent), publish the
 * seeded drafts and give paid plans a stand-in price for the store tests (seed:publish and
 * seed:store refuse anything but a local database).
 */
export default function setup() {
  execSync('pnpm seed && pnpm seed:publish && pnpm seed:store', { stdio: 'inherit' })
}
