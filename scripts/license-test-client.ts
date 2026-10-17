/**
 * pnpm license-test-client <command> — behaves like VYRO against any environment (spec §19,
 * docs/licensing-api.md, docs/runbooks/licensing.md). `--help` lists the commands.
 */
import 'dotenv/config' // only `validate --age-days` reads it: the local signing key

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { release, type } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

import {
  createLocalJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
  SignJWT,
  type JSONWebKeySet,
} from 'jose'
import { z } from 'zod'

import { licensingConfigFrom } from '../src/lib/licensing/keyMaterial'

const HELP = `Usage: pnpm license-test-client <command> [options]

Behaves like VYRO: every token it receives is verified offline the way the app must.
State per device (license key, current token): .license-client/<product>-<device>.json

Commands
  activate --key KEY   activate this device; stores the key and the token
  validate             exchange the stored token for a fresh one
    --age-days N       first re-sign it as if it expired N days ago. Local servers only: uses
                       LICENSING_PRIVATE_KEY from .env, or the development key derived from
                       PAYLOAD_SECRET (as the server does when the licensing keys are unset)
  deactivate           free this device's slot (counts toward the monthly limit)
  trial                start or resume this device's trial
  update-check         ask the update feed; warn when the update is past the token's update period
    --target windows --arch x86_64 --channel stable   (the defaults)
  keys                 print the server's JWKS (and refresh the cached copy)
  status               print the stored token's claims and whether it verifies
  scenario --key KEY --yes
                       spec §20 Phase 8 "done when" on fresh device names, PASS/FAIL per step:
                       device limit, deactivation, validate (also 100 days past expiry), the
                       monthly deactivation limit, trial start and resume. It USES UP the
                       license's deactivations for this month (India time) and leaves two devices
                       active, so use a key issued for testing; --yes confirms. It needs a key
                       with no active devices and stays under the server's 20 calls per key and
                       hour (Retry-After otherwise). The 100-days step is skipped without the
                       server's signing key (staging, production).

Options
  --base URL         server, default http://localhost:3000
  --product SLUG     default vyro
  --device NAME      default test-1; deviceId = hex sha256("license-test-client:" + NAME
                     + "vyro-device-v1")
  --version X.Y.Z    app version sent and asked about, default 1.0.0`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string', default: 'http://localhost:3000' },
    product: { type: 'string', default: 'vyro' },
    device: { type: 'string', default: 'test-1' },
    version: { type: 'string', default: '1.0.0' },
    key: { type: 'string' },
    'age-days': { type: 'string' },
    target: { type: 'string', default: 'windows' },
    arch: { type: 'string', default: 'x86_64' },
    channel: { type: 'string', default: 'stable' },
    yes: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

const base = new URL(values.base)
const { product, version } = values
if (!/^https?:$/.test(base.protocol)) throw new Error('--base must be an http(s) URL')
// Both end up in file names.
if (!/^[a-z0-9-]{1,64}$/.test(product)) throw new Error('--product must be a product slug')
if (!/^[A-Za-z0-9._-]{1,64}$/.test(values.device))
  throw new Error('--device: letters, digits . _ -')

const DAY = 86_400
const OS = `${type()} ${release()}`
const STATE_DIR = '.license-client'
const KEYS_FILE = path.join(STATE_DIR, `keys-${base.host.replace(/[^\w.-]/g, '_')}.json`)

// ---- HTTP -------------------------------------------------------------------------------

type Reply = { status: number; body: unknown; retryAfter: string | null }

async function api(method: 'GET' | 'POST', route: string, body?: object): Promise<Reply> {
  const res = await fetch(new URL(route, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `VYRO/${version} (license-test-client; ${OS})`,
    },
    body: body && JSON.stringify(body),
  })
  const text = await res.text()
  let json: unknown = text
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // not JSON: kept as text for the error message
  }
  return { status: res.status, body: json, retryAfter: res.headers.get('retry-after') }
}

const errorSchema = z.object({
  error: z.looseObject({ code: z.string(), message: z.string() }),
})
const codeOf = (reply: Reply) => errorSchema.safeParse(reply.body).data?.error.code

/** code + message + the extra fields, as docs/licensing-api.md "Errors" defines them. */
function errorText(reply: Reply): string {
  const parsed = errorSchema.safeParse(reply.body)
  if (!parsed.success) return `HTTP ${reply.status}: ${JSON.stringify(reply.body)}`
  const { code, message, ...extra } = parsed.data.error
  return [
    `${code} (HTTP ${reply.status}): ${message}`,
    ...Object.entries(extra).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`),
    ...(reply.retryAfter ? [`  Retry-After: ${reply.retryAfter} s`] : []),
  ].join('\n')
}

class Failure extends Error {
  constructor(readonly reply: Reply) {
    super(errorText(reply))
  }
}

async function post<T>(endpoint: string, body: object, schema: z.ZodType<T>): Promise<T> {
  const reply = await api('POST', `/api/v1/licensing/${endpoint}`, body)
  if (reply.status !== 200) throw new Failure(reply)
  return schema.parse(reply.body)
}

const licenseSchema = z.looseObject({
  plan: z.string(),
  status: z.string(),
  maxActivations: z.number(),
  activeDevices: z.number(),
  updatesUntil: z.string().nullable(),
})
const activateSchema = z.object({
  token: z.string(),
  license: licenseSchema,
  refreshAfter: z.string(),
})
const validateSchema = z.object({ token: z.string(), license: licenseSchema })
const trialSchema = z.object({ trialToken: z.string(), expiresAt: z.string() })
const okSchema = z.object({ ok: z.literal(true) })
const updateSchema = z.looseObject({ version: z.string(), pub_date: z.string() })
const jwksSchema = z.object({
  keys: z.array(z.looseObject({ kid: z.string(), x: z.string().optional() })),
})

// ---- State ------------------------------------------------------------------------------

const stateSchema = z.object({ key: z.string().optional(), token: z.string().optional() })
type State = z.infer<typeof stateSchema>

function readJson(file: string): unknown {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
  return JSON.parse(text)
}
function writeJson(file: string, value: unknown) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

type Device = { name: string; id: string; state: State }
const stateFile = (d: Device) => path.join(STATE_DIR, `${product}-${d.name}.json`)
const device = (name: string): Device => ({
  name,
  id: createHash('sha256').update(`license-test-client:${name}vyro-device-v1`).digest('hex'),
  state: {},
})
const load = (d: Device) => {
  d.state = stateSchema.parse(readJson(stateFile(d)) ?? {})
  return d
}
const save = (d: Device) => writeJson(stateFile(d), d.state)

// ---- Offline verification (docs/licensing-api.md "Verifying offline") ---------------------

async function fetchKeys() {
  const reply = await api('GET', '/api/v1/licensing/keys')
  if (reply.status !== 200) throw new Failure(reply)
  const jwks = jwksSchema.parse(reply.body)
  writeJson(KEYS_FILE, jwks)
  return jwks
}

/** The cached JWKS if it knows `kid`, else a fresh one from GET /keys. */
async function keysFor(kid: string) {
  const cached = jwksSchema.safeParse(readJson(KEYS_FILE)).data
  return cached?.keys.some((k) => k.kid === kid) ? cached : fetchKeys()
}

const claimsSchema = z.object({
  sub: z.string(),
  prd: z.string(),
  pln: z.string(),
  did: z.string(),
  upd: z.number().nullable(),
  iat: z.number(),
  exp: z.number(),
})
type Claims = z.infer<typeof claimsSchema>
type Verified = { kid: string; claims: Claims }

async function verifyOffline(token: string, d: Device): Promise<Verified> {
  const { kid } = decodeProtectedHeader(token)
  if (!kid) throw new Error('token has no kid')
  const jwks = await keysFor(kid)
  if (!jwks.keys.some((k) => k.kid === kid)) throw new Error(`unknown kid ${kid}`)
  const { payload } = await jwtVerify(token, createLocalJWKSet(jwks as JSONWebKeySet), {
    algorithms: ['EdDSA'],
    issuer: 'jainav-licensing',
    clockTolerance: 5 * 60,
  })
  const claims = claimsSchema.parse(payload)
  if (claims.prd !== product) throw new Error(`token prd is ${claims.prd}, not ${product}`)
  if (claims.did !== d.id) throw new Error('token did is not this device')
  return { kid, claims }
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString()

/** What the app concludes from a verified token. */
function describe({ kid, claims }: Verified) {
  const proToday = claims.upd === null || claims.upd * 1000 >= Date.now()
  return [
    `token verified offline (kid ${kid}): plan ${claims.pln}, sub ${claims.sub}`,
    `  updates until: ${claims.upd === null ? 'lifetime' : iso(claims.upd)}`,
    `  expires: ${iso(claims.exp)}`,
    `  a build released today: ${proToday ? 'Pro' : 'free tier (past the update period)'}`,
  ].join('\n')
}

// ---- What the app does ------------------------------------------------------------------

async function activate(d: Device, key: string) {
  const res = await post(
    'activate',
    { licenseKey: key, product, deviceId: d.id, deviceName: d.name, os: OS, appVersion: version },
    activateSchema,
  )
  const verified = await verifyOffline(res.token, d)
  d.state = { key, token: res.token }
  return { ...res, verified }
}

async function validate(d: Device, token: string) {
  const res = await post('validate', { token }, validateSchema)
  const verified = await verifyOffline(res.token, d)
  d.state.token = res.token
  return { ...res, verified }
}

async function deactivate(d: Device) {
  if (!d.state.key) throw new Error(`no key stored for ${d.name}: activate first`)
  await post('deactivate', { licenseKey: d.state.key, deviceId: d.id }, okSchema)
  delete d.state.token
}

async function trial(d: Device) {
  const res = await post('trial', { product, deviceId: d.id, appVersion: version }, trialSchema)
  const verified = await verifyOffline(res.trialToken, d)
  // An activated device runs on its license; the app has no use for a trial there.
  if (!d.state.key) d.state.token = res.trialToken
  return { ...res, verified }
}

/**
 * The stored token re-signed as if it expired `days` ago (iat and exp move together), with the
 * local signing key: the same keys the server uses when started from this .env.
 */
class NoLocalKey extends Error {}

async function agedToken(token: string, days: number) {
  const cfg = licensingConfigFrom(process.env)
  if (!cfg) {
    throw new NoLocalKey('--age-days needs the signing key: LICENSING_* in .env, or PAYLOAD_SECRET')
  }
  const { kid } = decodeProtectedHeader(token)
  const { x } = cfg.publicKey.export({ format: 'jwk' })
  if (kid !== cfg.kid || !(await keysFor(cfg.kid)).keys.some((k) => k.kid === kid && k.x === x)) {
    throw new NoLocalKey(
      `the local signing key (kid ${cfg.kid}, from .env) did not sign this token (kid ${kid}): --age-days only works against a server using the same keys`,
    )
  }
  const claims = decodeJwt(token)
  const shift = Math.floor(Date.now() / 1000) - days * DAY - Number(claims.exp)
  return new SignJWT({
    ...claims,
    iat: Number(claims.iat) + shift,
    exp: Number(claims.exp) + shift,
  })
    .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid })
    .sign(cfg.privateKey)
}

const summary = (license: z.infer<typeof licenseSchema>) =>
  `${license.plan} (${license.status}), ${license.activeDevices} of ${license.maxActivations} devices, updates until ${license.updatesUntil ?? 'lifetime'}`

// ---- Commands ---------------------------------------------------------------------------

const enc = encodeURIComponent

async function updateCheck(d: Device) {
  const { target, arch, channel } = values
  const reply = await api(
    'GET',
    `/api/v1/updates/${enc(product)}/${enc(target)}/${enc(arch)}/${enc(version)}?channel=${enc(channel)}`,
  )
  if (reply.status === 204) return console.log(`204: no release newer than ${version}`)
  if (reply.status !== 200) throw new Failure(reply)
  const update = updateSchema.parse(reply.body)
  console.log(JSON.stringify(reply.body, null, 2))
  if (!d.state.token) return console.log('no stored token: the free tier, nothing to compare')
  const { claims } = await verifyOffline(d.state.token, d)
  if (claims.upd === null) console.log('upd is null: no update period limit, may auto-update')
  else if (Date.parse(update.pub_date) > claims.upd * 1000) {
    console.warn(
      `WARNING: ${update.version} was published ${update.pub_date}, after the update period ended ${iso(claims.upd)}. The app warns instead of auto-updating: that build runs as the free tier.`,
    )
  } else console.log(`within the update period (until ${iso(claims.upd)}): may auto-update`)
}

async function status(d: Device) {
  if (d.state.key) console.log(`key stored: ending ${d.state.key.slice(-4)}`)
  if (!d.state.token) return console.log(`no token stored for ${d.name}`)
  const token = d.state.token
  const claims = decodeJwt(token)
  console.log(JSON.stringify({ header: decodeProtectedHeader(token), claims }, null, 2))
  console.log(`issued ${iso(Number(claims.iat))}, expires ${iso(Number(claims.exp))}`)
  console.log(describe(await verifyOffline(token, d)))
}

/** spec §20 Phase 8 "done when", on fresh device names. Stops the license steps at a FAIL. */
async function scenario(key: string) {
  const run = Date.now().toString(36)
  const dev = (n: string) => device(`scn-${run}-${n}`)
  const [A, C, T] = [dev('a'), dev('c'), dev('trial')]
  let failed = 0
  let keyCalls = 0 // activate and deactivate share the key's limit (20 per hour)
  let tokenCalls = 0 // validate counts per license
  const KEY_BUDGET = 20

  const step = async (name: string, check: () => Promise<string>) => {
    try {
      console.log(`PASS  ${name}: ${await check()}`)
    } catch (error) {
      // Against staging or production: nobody has their signing key locally.
      if (error instanceof NoLocalKey) return console.log(`SKIP  ${name}: ${error.message}`)
      failed++
      console.log(`FAIL  ${name}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('stopped')
    }
  }
  const act = (d: Device) => {
    if (++keyCalls > KEY_BUDGET) throw new Error('over the per-key budget of 20 calls')
    return activate(d, key)
  }
  const deact = (d: Device) => {
    if (++keyCalls > KEY_BUDGET) throw new Error('over the per-key budget of 20 calls')
    return deactivate(d)
  }
  const expectError = async (code: string, call: () => Promise<unknown>) => {
    try {
      await call()
    } catch (error) {
      if (error instanceof Failure && codeOf(error.reply) === code) {
        return error.message.replace(/\n\s*/g, '; ')
      }
      throw error
    }
    throw new Error(`expected ${code}, got 200`)
  }

  try {
    let fillers: Device[] = []
    await step(`activate ${A.name}`, async () => {
      const { license } = await act(A)
      if (license.activeDevices !== 1) {
        throw new Error(`the key already has ${license.activeDevices - 1} other device(s) active`)
      }
      if (license.maxActivations < 2) throw new Error('needs a license for 2 or more devices')
      fillers = Array.from({ length: license.maxActivations - 1 }, (_, i) => dev(`b${i + 1}`))
      return summary(license)
    })
    for (const B of fillers) {
      await step(`activate ${B.name}`, async () => summary((await act(B)).license))
    }
    await step(`activate ${C.name} (expect activation_limit_reached)`, () =>
      expectError('activation_limit_reached', () => act(C)),
    )
    await step(`deactivate ${fillers[0].name}`, async () => {
      await deact(fillers[0])
      return 'slot freed'
    })
    await step(`activate ${C.name}`, async () => summary((await act(C)).license))
    await step(`validate ${A.name} (fresh token)`, async () => {
      tokenCalls++
      return summary((await validate(A, A.state.token!)).license)
    })
    await step(`validate ${A.name} (token 100 days past exp)`, async () => {
      tokenCalls++
      const { license, verified } = await validate(A, await agedToken(A.state.token!, 100))
      return `${summary(license)}; new token expires ${iso(verified.claims.exp)}`
    })
    await step(`deactivate ${C.name}`, async () => {
      await deact(C)
      return 'slot freed'
    })
    for (let cycle = 1; ; cycle++) {
      await step(`cycle ${cycle}: activate ${C.name}`, async () => summary((await act(C)).license))
      let limited = ''
      await step(`cycle ${cycle}: deactivate ${C.name}`, async () => {
        try {
          await deact(C)
          return 'slot freed'
        } catch (error) {
          if (!(error instanceof Failure && codeOf(error.reply) === 'deactivation_limit_reached')) {
            throw error
          }
          limited = error.message.replace(/\n\s*/g, '; ')
          return limited
        }
      })
      if (limited) break
    }
  } catch (error) {
    if (!(error instanceof Error && error.message === 'stopped')) throw error
    console.log('      (license steps stopped)')
  }

  try {
    let expiresAt = ''
    await step(`trial ${T.name} (start)`, async () => {
      ;({ expiresAt } = await trial(T))
      return `expires ${expiresAt}`
    })
    await step(`trial ${T.name} (resume)`, async () => {
      const again = await trial(T)
      if (again.expiresAt !== expiresAt) throw new Error(`expiresAt moved to ${again.expiresAt}`)
      return `same expiresAt ${again.expiresAt}, new token`
    })
  } catch (error) {
    if (!(error instanceof Error && error.message === 'stopped')) throw error
  }

  console.log(
    `\n${failed ? `${failed} step(s) FAILED` : 'all steps passed'}; ${keyCalls} activate/deactivate calls on this key (limit ${KEY_BUDGET}/hour), ${tokenCalls} validate.`,
  )
  if (!failed) {
    console.log(
      `${A.name} and ${C.name} stay active and this month's deactivations are used up: Support can untick Active on them (Store → Activations).`,
    )
  }
  return failed === 0
}

async function main(): Promise<boolean> {
  const [command] = positionals
  if (values.help || !command) {
    console.log(HELP)
    return values.help
  }
  const d = load(device(values.device))
  const where = `${d.name} at ${base.origin}`
  switch (command) {
    case 'activate': {
      if (!values.key) throw new Error('activate needs --key')
      const res = await activate(d, values.key)
      save(d)
      console.log(`activated ${where}\nlicense: ${summary(res.license)}`)
      console.log(`refresh after: ${res.refreshAfter}\n${describe(res.verified)}`)
      return true
    }
    case 'validate': {
      if (!d.state.token) throw new Error(`no token stored for ${d.name}: activate first`)
      const days = values['age-days']
      if (days !== undefined && !/^\d{1,5}$/.test(days)) throw new Error('--age-days: whole days')
      const token = days === undefined ? d.state.token : await agedToken(d.state.token, +days)
      const res = await validate(d, token)
      save(d)
      console.log(`validated ${where}${days ? ` (token ${days} days past exp)` : ''}`)
      console.log(`license: ${summary(res.license)}\n${describe(res.verified)}`)
      return true
    }
    case 'deactivate':
      await deactivate(d)
      save(d)
      console.log(`deactivated ${where}`)
      return true
    case 'trial': {
      const res = await trial(d)
      save(d)
      console.log(`trial for ${where}: expires ${res.expiresAt}\n${describe(res.verified)}`)
      if (d.state.token !== res.trialToken) console.log('(license token kept: trial not stored)')
      return true
    }
    case 'update-check':
      await updateCheck(d)
      return true
    case 'keys':
      console.log(JSON.stringify(await fetchKeys(), null, 2))
      return true
    case 'status':
      await status(d)
      return true
    case 'scenario':
      if (!values.key) throw new Error('scenario needs --key')
      if (!values.yes) {
        throw new Error(
          "scenario uses up this month's deactivations of the license: add --yes to run it",
        )
      }
      return scenario(values.key)
    default:
      throw new Error(`unknown command ${command} (see --help)`)
  }
}

// exitCode, not process.exit(): exiting with fetch sockets still open crashes Node on Windows.
main().then(
  (ok) => {
    process.exitCode = ok ? 0 : 1
  },
  (error: unknown) => {
    const cause = (error as { cause?: { code?: string } } | null)?.cause?.code
    console.error(
      error instanceof Failure
        ? error.message
        : `error: ${error instanceof Error ? error.message : String(error)}${cause ? ` (${cause})` : ''}`,
    )
    process.exitCode = 1
  },
)
