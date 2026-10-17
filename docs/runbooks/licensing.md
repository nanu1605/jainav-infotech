# Licensing: keys, complimentary licenses, support, testing (Phase 8)

The VYRO licensing API (spec §12, contract in [../licensing-api.md](../licensing-api.md)) signs license tokens with an Ed25519 key, stores license keys encrypted and device ids peppered. This runbook covers the secrets behind that, issuing licenses by hand, the support actions, and testing an environment with `scripts/license-test-client`.

Locally nothing is needed: without the licensing variables, development derives all four from `PAYLOAD_SECRET` (kid `dev`). Production and staging refuse to do that: the API, `/api/v1/licensing/health` and creating a license answer 503 until the keys are installed.

## The secrets

| Variable                     | What it is                                                           | If it is lost or changed                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `LICENSING_PRIVATE_KEY`      | Ed25519 signing key (base64 PKCS#8 DER on one line; PEM also works)  | Tokens can't be signed with it any more: rotate ([below](#rotating-the-signing-key)), which needs a VYRO build                         |
| `LICENSING_KEY_ID`           | Its `kid`, in every token header and in `GET /keys`                  | Changes only together with the signing key                                                                                             |
| `LICENSE_KEY_ENCRYPTION_KEY` | AES-256 key for the stored copies of license keys (32 bytes, base64) | **Never change it.** Every stored key copy becomes unreadable: customers' Licenses pages, the admin and license emails can't show keys |
| `DEVICE_ID_PEPPER`           | Mixed into the stored device hashes (32 bytes, base64)               | **Never change it.** No device matches its activation any more: every device takes a new slot and customers hit the device limit       |

Each environment has its own set: staging never uses production's keys (a staging token must not unlock Pro in a release build).

## Generating and installing the keys

1. On your own machine, in a checkout of the repository:

   ```bash
   pnpm gen:licensing-keys                  # production: kid = this month in India time, e.g. 2026-10
   pnpm gen:licensing-keys staging-2026-10  # staging: a kid of its own, so builds never confuse the two
   ```

   It prints the four `KEY=value` lines and the public key as a JWK, and writes no files. Don't paste the output into chats, tickets or commits.

2. Put the four lines into the app's env file on the server, `/srv/jainav/production.env` (or `staging.env`) ([server.md](server.md), section 2), which stays `chmod 600`. They never go into the repository, `.env.example`, GitHub variables or the image.
3. Keep a copy of all four values in the password manager, next to the backup key ([backups.md](backups.md)). A restored database is only usable with the same encryption key and pepper.
4. Restart the app so it reads them, in `/srv/jainav`:

   ```bash
   docker compose -f compose.prod.yml up -d --force-recreate app   # app-staging for staging
   ```

5. Check: `curl -s https://{{DOMAIN}}/api/v1/licensing/health` answers `{"ok":true}`, and `curl -s https://{{DOMAIN}}/api/v1/licensing/keys` lists the new `kid` with the same `x` as the printed JWK.
6. Give the public JWK (not the private key) to the VYRO build: release builds embed production's key; test builds may also embed staging's.

## Rotating the signing key

Plan this when the day comes (a suspected leak, or a scheduled change). Today the server only knows one key: `GET /keys` lists the active key alone, and `/validate` accepts only tokens with its `kid`. A rotation therefore needs both a server change and a VYRO release, in this order:

1. **New pair:** `pnpm gen:licensing-keys --signing-only <new kid>` prints only `LICENSING_PRIVATE_KEY`, `LICENSING_KEY_ID` and the public JWK. The encryption key and pepper stay as they are.
2. **VYRO build** that embeds both the old and the new public key, released and given time to spread. A build that knows only the old `kid` rejects new tokens offline and drops to the free tier once its token is refreshed.
3. **Server change** (a code change, planned then): sign with the new key, while still listing the old public key in `GET /keys` and accepting it in `/validate` (tokens up to 180 days past `exp` come back with the old `kid`). Deploy it with the new `LICENSING_PRIVATE_KEY` / `LICENSING_KEY_ID`.
4. **Retire the old key** from `/validate` once no token signed with it can still be presented (30 days of token life + 180 days of grace after the switch), and from `GET /keys` once no supported build needs it.

After a leak, go through the same steps without waiting in step 2: anyone holding the old key can sign tokens that old builds accept offline, so only builds without the old key are safe, and customers on old builds need to update.

## Issuing a complimentary license (Owner)

1. Someone new: Store → Customers → Create new: email, name, language (emails go out in it). Save.
2. Store → Licenses → Create new: **Product** (VYRO), **Plan** (Pro), **Customer**. Leave Status `active` and Source `complimentary`. Empty Max activations and Updates until take the plan's values (as seeded: 2 devices, 12 months of updates); fill them in to give something else.
3. Save. The key is generated on save, appears in the License key field, and is emailed to the customer within a minute (the job queue). The customer also sees it on their account's Licenses page once they sign in with that email.

The license can't be deleted afterwards; revoke it instead.

## Support actions

Both Owner and Support can do these in Store → Licenses and Store → Activations:

- **Suspend / reinstate:** open the license → Status `suspended` (or back to `active`) → Save. The app drops to the free tier at its next `/validate` (every 7 days; offline it keeps Pro until its token expires, at most 30 days). Revoking, and undoing a revocation, is the Owner's.
- **Extend updates:** Updates until → a later date (or clear it for lifetime updates) → Save. The app gets the new date with its next token (refresh, or re-activate from the app).
- **Free a device slot:** Store → Activations → the device → untick Active → Save. It doesn't count toward the customer's 3 self-service deactivations a month, so it is also the answer to `deactivation_limit_reached`. A freed device can't be ticked back on; it activates again from the app.

## Testing an environment with the test client

`pnpm license-test-client` behaves like VYRO: it activates, validates, deactivates, starts trials and checks for updates, and verifies every token offline as the app must. `pnpm license-test-client --help` lists everything. Its state (license keys and tokens) lives in `.license-client/`, which is gitignored.

**Locally:** `pnpm seed:store` prints the dev customer's VYRO Pro key (it creates `dev-buyer@example.test` and the license the first time). Then, with `pnpm dev` running:

```bash
pnpm license-test-client activate --key VYRO-XXXXX-XXXXX-XXXXX-XXXXX
pnpm license-test-client validate --age-days 100   # a token 100 days past exp still validates
pnpm license-test-client status
pnpm license-test-client deactivate
pnpm license-test-client trial --device test-2
pnpm license-test-client update-check --version 0.0.1
```

`scenario` (below) works locally too, including its "100 days past exp" step. It uses up the license's deactivations for the month: for another run, issue a second license in the local admin.

**Staging:** the licensing and update paths skip staging's basic auth. As Owner on staging, issue a complimentary license to your own address (above), then:

```bash
pnpm license-test-client --base https://staging.{{DOMAIN}} activate --key <key>
pnpm license-test-client --base https://staging.{{DOMAIN}} scenario --key <another key> --yes
```

`scenario` runs spec §20 Phase 8's "done when" on fresh device names and prints PASS/FAIL per step: both device slots, the device limit, a deactivation, validation, the monthly deactivation limit, trial start and resume. It needs a license with no active devices, uses up that license's deactivations for the month and leaves its devices active (it lists them at the end), so issue a license just for it (Support can untick them afterwards). It stays under the server's limit of 20 calls per key and hour. The "100 days past exp" step needs the server's signing key on your machine, so it runs locally only and shows SKIP against staging; never copy staging's or production's private key to do it.

Still checked by hand: suspend the test license in the admin, then `validate` answers `license_suspended` (`license_revoked` after the Owner revokes it); the account's Licenses page shows the devices and frees one.

Rate limits: 60 licensing calls per IP per 10 minutes, 20 per license key per hour. A 429 prints `Retry-After`. Locally, `DELETE FROM rate_limit.hits` on the dev database resets them.

## Uptime monitor

Add `https://{{DOMAIN}}/api/v1/licensing/health` to the uptime monitor ([monitoring.md](monitoring.md)): HTTP 200 with `"ok":true`. It answers 503 when the licensing keys are missing or the database doesn't answer, so it also catches an app started without its licensing variables.
