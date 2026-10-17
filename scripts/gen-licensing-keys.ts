/**
 * pnpm gen:licensing-keys [kid] [--signing-only] — prints new licensing secrets for a server's
 * env file (spec §12.3, docs/runbooks/licensing.md). Writes no files.
 *
 *   kid             LICENSING_KEY_ID, default this month in India time (e.g. 2026-10)
 *   --signing-only  just a new signing key and kid, for rotation
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'signing-only': { type: 'boolean', default: false } },
})

// en-CA formats dates as YYYY-MM-DD.
const kid =
  positionals[0] ??
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .slice(0, 7)
if (!/^[A-Za-z0-9._-]{1,64}$/.test(kid)) throw new Error(`Not a usable key id: ${kid}`)

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const { kty, crv, x } = publicKey.export({ format: 'jwk' })
const secret = () => randomBytes(32).toString('base64')

const lines = [
  `LICENSING_PRIVATE_KEY=${privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')}`,
  `LICENSING_KEY_ID=${kid}`,
]
if (!values['signing-only']) {
  lines.push(`LICENSE_KEY_ENCRYPTION_KEY=${secret()}`, `DEVICE_ID_PEPPER=${secret()}`)
}

console.log(`# Server env (production.env or staging.env, never committed):\n${lines.join('\n')}\n`)
console.log('# Public key for VYRO to embed (GET /api/v1/licensing/keys serves the same):')
console.log(JSON.stringify({ kty, crv, x, kid, alg: 'EdDSA', use: 'sig' }, null, 2))
console.warn(`
WARNING
- LICENSE_KEY_ENCRYPTION_KEY and DEVICE_ID_PEPPER must never change once licenses exist:
  a new encryption key loses every stored key copy, a new pepper every device match.
- A new signing key needs a new kid and a VYRO build that embeds its public key; builds that
  only know the old kid reject its tokens. See docs/runbooks/licensing.md before rotating.`)
