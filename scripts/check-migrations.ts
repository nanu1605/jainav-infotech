/**
 * pnpm check:migrations — fails when the Payload config and the newest committed migration
 * snapshot describe different database schemas (spec §18.3: every schema change ships as a
 * migration; production never uses schema push). Fix with `pnpm payload migrate:create <name>`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

type DrizzleKit = {
  generateDrizzleJson(schema: unknown): Promise<Record<string, unknown>> | Record<string, unknown>
}
// The Postgres adapter exposes these at runtime, but its public type doesn't declare them.
type Adapter = { requireDrizzleKit(): DrizzleKit; schema: unknown }

/** JSON with object keys sorted, so key order never counts as a difference. */
const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )

const dir = path.resolve('src/migrations')
const latest = readdirSync(dir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .at(-1)
if (!latest) throw new Error('No migration snapshot found in src/migrations.')

const payload = await getPayload({ config })
const adapter = payload.db as unknown as Adapter
const current = await adapter.requireDrizzleKit().generateDrizzleJson(adapter.schema)
const committed = JSON.parse(readFileSync(path.join(dir, latest), 'utf8')) as Record<
  string,
  unknown
>

const drifted = (['tables', 'enums'] as const).filter(
  (key) => stable(current[key]) !== stable(committed[key]),
)
if (drifted.length) {
  payload.logger.error(
    `Schema drift: the config's ${drifted.join(' and ')} differ from ${latest}. Run \`pnpm payload migrate:create <name>\` and commit it.`,
  )
  process.exit(1)
}
payload.logger.info(`check:migrations passed (${latest}).`)
