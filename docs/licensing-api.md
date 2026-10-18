# Licensing API v1

The contract between the website and the VYRO desktop app (spec §12). The website side is built in Phase 8; this document comes first so the app work can start now. The endpoints, fields and error codes below are fixed: changing them needs Tanishq's approval (spec §0.6), and once a public VYRO build uses them they only ever gain optional fields.

- **Base URL:** `https://{{DOMAIN}}/api/v1/licensing`
- **Transport:** HTTPS only. JSON request and response bodies (`Content-Type: application/json`, UTF-8). Request bodies larger than 4 KB are refused.
- **Clients:** call from Rust (or the Tauri HTTP plugin), not from webview `fetch`: the API sends no CORS headers.
- **User agent:** please send `User-Agent: VYRO/{appVersion} ({os})`, e.g. `VYRO/1.0.1 (Windows 11 26100)`. It is used in logs and support only.
- **Unknown fields:** clients must ignore response fields they don't know. New optional fields may be added to v1; anything else gets a v2.

## Errors

Every error has the same shape. `code` is stable and meant for the app's logic; `message` is English text for logs, not for showing to customers (the app has its own localized strings). Some errors carry extra fields next to `code` and `message`, listed per endpoint.

```json
{
  "error": {
    "code": "activation_limit_reached",
    "message": "This license is active on 2 of 2 devices."
  }
}
```

| HTTP      | `code`                       | Meaning                                                                                |
| --------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| 400       | `invalid_request`            | Body is not JSON, a field is missing, or a value has the wrong format                  |
| 401       | `invalid_token`              | Token signature is wrong, the token is malformed, or it expired more than 180 days ago |
| 403       | `license_revoked`            | The license was revoked (for example after a refund)                                   |
| 403       | `license_suspended`          | The license is suspended (for example during a payment dispute)                        |
| 404       | `license_not_found`          | No license matches the key for this product                                            |
| 404       | `activation_not_found`       | The device has no active activation for this license (it was deactivated)              |
| 409       | `activation_limit_reached`   | Every device slot is in use; extra field `devices`                                     |
| 409       | `deactivation_limit_reached` | Too many deactivations this month; extra field `resetsAt`                              |
| 409       | `trial_used`                 | This device's trial has ended; extra field `expiredAt`                                 |
| 429       | `rate_limited`               | Too many requests; wait for the `Retry-After` header (seconds)                         |
| 500 / 503 | `server_error`               | Something went wrong on our side; retry later with backoff                             |

Requests are rate-limited per IP address and per license key. The limits are generous for normal use (a handful of calls per device per week) and may change; always honour `Retry-After` and never retry in a tight loop.

## Identifiers and formats

**Device id.** The app computes it; the server never sees the raw machine id:

```
deviceId = lowercase hex( sha256( MachineGuid + "vyro-device-v1" ) )   // 64 characters
```

`MachineGuid` is the string value `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`, used exactly as read (no trimming or case change). The server stores only `sha256(deviceId + DEVICE_ID_PEPPER)`.

**License key.** `VYRO-XXXXX-XXXXX-XXXXX-XXXXX`: the product prefix and 20 characters of Crockford Base32 (100 random bits). Send the key exactly as the customer typed or pasted it; the server normalizes it (uppercase; remove spaces and hyphens; O → 0; I and L → 1). The app may check the shape before sending, but must accept lowercase, missing hyphens and extra spaces.

**Other fields.**

| Field        | Format                                                        |
| ------------ | ------------------------------------------------------------- |
| `product`    | Product slug: `vyro`                                          |
| `deviceName` | 1–100 characters, the Windows computer name is a good default |
| `os`         | 1–100 characters, e.g. `Windows 11 Pro 26100`                 |
| `appVersion` | Semantic version of the running build, e.g. `1.0.1`           |
| Timestamps   | RFC 3339 in UTC, e.g. `2027-10-16T09:30:00Z`                  |

## License tokens

A license token is a JWT signed with Ed25519.

**Header:** `{ "alg": "EdDSA", "typ": "JWT", "kid": "<key id>" }`

**Claims:**

| Claim | Value                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------- |
| `iss` | `"jainav-licensing"`                                                                                      |
| `sub` | License id as a string, e.g. `"42"`. Trial tokens: `"trial:<id>"`                                         |
| `prd` | Product slug, `"vyro"`                                                                                    |
| `pln` | Plan code, e.g. `"pro"`; `"trial"` for trials                                                             |
| `did` | The `deviceId` the token was issued to                                                                    |
| `upd` | End of the license's update period (NumericDate, seconds since the epoch), or `null` for lifetime updates |
| `iat` | Issued at (NumericDate)                                                                                   |
| `exp` | `iat` + 30 days for license tokens; the trial's end for trial tokens                                      |

**Verifying offline (the app must):**

1. Pin the algorithm to `EdDSA`; reject any other `alg`, including `none`.
2. Pick the public key by `kid` from the keys embedded in the build (the same keys `GET /keys` serves). Unknown `kid` → treat as invalid.
3. Check the signature, then `iss == "jainav-licensing"`, `prd == "vyro"` and `did ==` this device's `deviceId`.
4. Check `exp` against the system clock, allowing 5 minutes of clock skew.
5. **Update period:** Pro applies to this build only if `upd` is `null` or `upd` ≥ the build's release time (embedded at build time). An older build keeps Pro forever; a newer build than the update period runs as the free tier.

**Refreshing.** After `refreshAfter` (returned by `/activate`; 7 days after issue), the app calls `/validate` in the background and stores the new token. Later tokens refresh on the same schedule: 7 days after their `iat`. Offline, the app keeps Pro until the token's `exp`. If `/validate` answers `invalid_token` (the token is more than 180 days past `exp`) or `activation_not_found`, the app re-activates silently with the stored key (`/activate`). If it answers `license_revoked` or `license_suspended`, the app drops to the free tier and shows why.

**Storage.** The app stores the license key and the current token with Windows DPAPI (current user scope).

## Endpoints

### `POST /activate`

Activates a license on this device and returns a token. Activating the same license on the same device again returns the existing activation (it does not use another slot) and refreshes its `lastSeenAt`.

Request:

```json
{
  "licenseKey": "VYRO-7K2QD-M9X4T-BH3NC-PW8RA",
  "product": "vyro",
  "deviceId": "3f5c…64 hex…",
  "deviceName": "GAMING-PC",
  "os": "Windows 11 Pro 26100",
  "appVersion": "1.0.1"
}
```

200:

```json
{
  "token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjYtMTAifQ…",
  "license": {
    "plan": "pro",
    "status": "active",
    "maxActivations": 2,
    "activeDevices": 1,
    "updatesUntil": "2027-10-16T09:30:00Z"
  },
  "refreshAfter": "2026-10-23T09:30:00Z"
}
```

`updatesUntil` is `null` for lifetime updates. Errors: 400 `invalid_request` · 404 `license_not_found` · 403 `license_revoked` / `license_suspended` · 409 `activation_limit_reached` · 429 `rate_limited`.

`activation_limit_reached` lists the devices using the slots, so the app can say where the license is active. The customer frees a slot from the app on that device (`/deactivate`) or from their account page (`/account/licenses`).

```json
{
  "error": {
    "code": "activation_limit_reached",
    "message": "This license is active on 2 of 2 devices.",
    "devices": [
      { "deviceName": "GAMING-PC", "lastSeenAt": "2026-10-14T18:02:11Z" },
      { "deviceName": "OFFICE-LAPTOP", "lastSeenAt": "2026-10-16T07:45:40Z" }
    ]
  }
}
```

### `POST /validate`

Exchanges a license token for a fresh one after re-checking the license in the database. Accepts any token with a valid signature whose `exp` is at most 180 days in the past.

Request: `{ "token": "eyJ…" }`

200: `{ "token": "eyJ…", "license": { …same object as /activate… } }`

Errors: 400 `invalid_request` · 401 `invalid_token` · 403 `license_revoked` / `license_suspended` · 404 `activation_not_found` · 429 `rate_limited`.

Trial tokens are not refreshed here (401 `invalid_token`); call `/trial` again instead.

### `POST /deactivate`

Frees this device's slot. A license allows 3 self-service deactivations per calendar month (India time, `Asia/Kolkata`); the account page's "Deactivate" counts toward the same limit.

Request: `{ "licenseKey": "VYRO-…", "deviceId": "3f5c…" }`

200: `{ "ok": true }`

Errors: 400 `invalid_request` · 404 `license_not_found` / `activation_not_found` · 409 `deactivation_limit_reached` · 429 `rate_limited`.

```json
{
  "error": {
    "code": "deactivation_limit_reached",
    "message": "This license has used its 3 deactivations for this month.",
    "resetsAt": "2026-10-31T18:30:00Z"
  }
}
```

`resetsAt` is the start of the next month in India time, given in UTC.

### `POST /trial`

Starts this device's 14-day Pro trial, or returns the running one. Calling it again while the trial runs returns the same `expiresAt` with a new token, so the app can call it on every start without side effects.

Request: `{ "product": "vyro", "deviceId": "3f5c…", "appVersion": "1.0.1" }`

200: `{ "trialToken": "eyJ…", "expiresAt": "2026-10-30T09:30:00Z" }`

The trial token is a license token with `pln: "trial"`, `upd: null` and `exp` = `expiresAt`. Errors: 400 `invalid_request` · 409 `trial_used` · 429 `rate_limited`.

```json
{
  "error": {
    "code": "trial_used",
    "message": "This device's trial ended.",
    "expiredAt": "2026-09-30T09:30:00Z"
  }
}
```

### `GET /keys`

The public keys as a JWKS. The app embeds these at build time; this endpoint is for checking and for key rotation (a new key gets a new `kid`, and old keys stay listed until no supported build uses them).

```json
{
  "keys": [
    {
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "<base64url public key>",
      "kid": "2026-10",
      "alg": "EdDSA",
      "use": "sig"
    }
  ]
}
```

### `GET /health`

200 `{ "ok": true }` when the API and its database answer. The uptime monitor uses it (spec §18.4).

## Related: the update feed

Not part of this API. VYRO doesn't use it: installed copies update from GitHub (`nanu1605/vyro-releases`, the release's `latest.json`; docs/decisions.md, "VYRO updates"). The site's feed (spec §12.5, built in Phase 3) stays for a later switch:

```
GET https://{{DOMAIN}}/api/v1/updates/vyro/{{target}}/{{arch}}/{{current_version}}?channel=stable
```

200 with Tauri's `{ version, notes, pub_date, url, signature }`, or 204 when there is no newer release. Whichever feed the app reads, it compares `pub_date` with the token's `upd` before installing and warns instead of auto-updating when the update is past the customer's update period.

## Quick test with curl

```bash
curl -s https://{{DOMAIN}}/api/v1/licensing/trial \
  -H 'Content-Type: application/json' \
  -d '{"product":"vyro","deviceId":"0000000000000000000000000000000000000000000000000000000000000000","appVersion":"1.0.1"}'
```

From Phase 8, `scripts/license-test-client` behaves like the app (activate, validate, deactivate, trial, update check) against any environment.
