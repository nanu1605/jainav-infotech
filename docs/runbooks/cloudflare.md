# Cloudflare, R2 and email DNS

Everything public goes through Cloudflare (spec §16, §18.6). `{{DOMAIN}}` is the company domain.
Do these in the Cloudflare dashboard for the domain's zone.

## DNS

| Name                | Type                                                                  | Value                                                             | Proxy    |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| `{{DOMAIN}}` (apex) | A / AAAA                                                              | the VPS                                                           | proxied  |
| `www`               | A / AAAA                                                              | the VPS (Caddy redirects to the apex with a 308)                  | proxied  |
| `staging`           | A / AAAA                                                              | the VPS                                                           | proxied  |
| `analytics`         | A / AAAA                                                              | the VPS (Umami)                                                   | proxied  |
| `ssh`               | created by the tunnel ([SSH tunnel](#ssh-tunnel))                     | the VPS's SSH, behind Access                                      | proxied  |
| `status`            | CNAME                                                                 | the uptime monitor's status page ([monitoring.md](monitoring.md)) | DNS only |
| `cdn`               | R2 custom domain on the public bucket (media)                         |                                                                   | proxied  |
| `downloads`         | R2 custom domain on the public bucket (installers under `downloads/`) |                                                                   | proxied  |
| mail records        | see [Email](#email)                                                   |                                                                   | DNS only |

## SSL

- SSL/TLS → Overview: **Full (strict)**.
- SSL/TLS → Origin Server → Create Certificate: RSA, hostnames `{{DOMAIN}}` and
  `*.{{DOMAIN}}`, 15 years. Save the certificate as `/srv/jainav/certs/origin.pem` and the
  private key as `/srv/jainav/certs/origin-key.pem` (`chmod 600`). Caddy serves it for every
  site; browsers never see it, only Cloudflare does.
- Edge Certificates: Always Use HTTPS on; minimum TLS 1.2. The app sends HSTS itself
  (`max-age=31536000; includeSubDomains`, no preload).

## Security

- **Bot Fight Mode: off** (Security → Bots). It can't be bypassed for API traffic, so it would
  break VYRO activation, the update feed and webhooks.
- **WAF skip rule** (Security → WAF → Custom rules → Create, action _Skip_, skip all remaining
  custom rules, rate limiting rules, managed rules and Super Bot Fight Mode), expression:

  ```
  starts_with(http.request.uri.path, "/api/v1/licensing/") or
  starts_with(http.request.uri.path, "/api/v1/updates/") or
  starts_with(http.request.uri.path, "/api/v1/webhooks/") or
  starts_with(http.request.uri.path, "/api/v1/downloads/")
  ```

- **Origin firewall:** only Cloudflare reaches the VPS (provider firewall,
  [server.md](server.md#1-provision-the-vps)). That is also why the app can trust the
  `CF-Connecting-IP` header for rate limits.
- **Cloudflare Access** (Zero Trust → Access → Applications → Add → Self-hosted). One
  application, with these paths:
  - `{{DOMAIN}}/admin` and `{{DOMAIN}}/admin/*`
  - `{{DOMAIN}}/api/users/*`
  - the same three paths on `staging.{{DOMAIN}}`

  Policy: _Allow_, include the emails of the people who run the site; one-time PIN or Google as
  the login method; session 24 hours. Payload's own login (5 attempts, then a 15-minute lock)
  still applies behind it. Afterwards set the repository variables `STAGING_SMOKE_ADMIN_ACCESS`
  and `PRODUCTION_SMOKE_ADMIN_ACCESS` to `1`: the smoke tests then check that `/admin`
  redirects to `cloudflareaccess.com`.

## SSH tunnel

The VPS's SSH port stays closed to the internet. Deploys from GitHub, and your own sessions,
reach it through a Cloudflare Tunnel.

1. Zero Trust → Networks → Tunnels → Create a tunnel (Cloudflared), named `jainav-vps`. Run
   the install command it shows on the VPS: Debian package plus `cloudflared service install
<token>`. The connector only makes outbound connections.
2. In the tunnel, add a public hostname `ssh.{{DOMAIN}}` with service `ssh://localhost:22`.
3. Zero Trust → Access → Service Auth → Create service token `github-deploy`. Its client ID and
   secret go in the GitHub environment secrets `CF_ACCESS_CLIENT_ID` and
   `CF_ACCESS_CLIENT_SECRET` ([server.md §4](server.md#4-github-setup-once)).
4. Access → Applications → Add → Self-hosted, domain `ssh.{{DOMAIN}}`, two policies:
   - _Service Auth_: include the service token `github-deploy`;
   - _Allow_: include your own email, for interactive sessions.
5. On your machine, install `cloudflared` and add the `Host jainav` block from
   [server.md §1](server.md#1-provision-the-vps). `ssh jainav` opens a browser sign-in the
   first time.
6. Once `ssh jainav` works, close port 22 in the provider firewall.

## R2

Create these buckets (R2 → Create bucket, location hint Asia-Pacific):

| Bucket                                            | Public                                 | Used for                    | Env vars                                                 |
| ------------------------------------------------- | -------------------------------------- | --------------------------- | -------------------------------------------------------- |
| `jainav-public`                                   | custom domains `cdn.` and `downloads.` | media, installers           | `S3_BUCKET`, `NEXT_PUBLIC_CDN_URL`, `DOWNLOADS_BASE_URL` |
| `jainav-private`                                  | no                                     | CVs, later invoices         | `S3_PRIVATE_BUCKET`                                      |
| `jainav-backups`                                  | no                                     | encrypted database dumps    | `BACKUP_BUCKET` (server `.env`)                          |
| `jainav-staging-public`, `jainav-staging-private` | as above                               | staging's files, kept apart | staging.env                                              |

API tokens (R2 → Manage API tokens), each _Object Read & Write_ on the named buckets only:

- the app (production): `jainav-public`, `jainav-private`;
- the app (staging): the two staging buckets;
- backups: `jainav-backups`.

`S3_ENDPOINT` / `BACKUP_S3_ENDPOINT` is `https://<account-id>.r2.cloudflarestorage.com`,
`S3_REGION=auto`.

## Turnstile

Turnstile → Add widget for `{{DOMAIN}}` and `staging.{{DOMAIN}}`, managed mode. The site key goes
in the repository variables `STAGING_TURNSTILE_SITE_KEY` / `PRODUCTION_TURNSTILE_SITE_KEY`, the secret in
`TURNSTILE_SECRET_KEY` (production.env / staging.env).

## Email

Two kinds of mail, kept apart:

- **The site's mail** (auto-replies, alerts, newsletter): sent by Resend from a subdomain.
  Resend → Domains → Add `send.{{DOMAIN}}` (or the name Resend suggests) and create the records
  it lists: its DKIM `TXT`, plus the `MX` and SPF `TXT` (`v=spf1 include:amazonses.com ~all`)
  on its return-path subdomain. `EMAIL_FROM` is an address on that domain.
- **Mailboxes** (hello@, sales@, support@, careers@, privacy@): the provider Tanishq picks
  (Zoho Mail, Google Workspace…). Add its `MX` records and its SPF `TXT` on the apex, e.g.
  `v=spf1 include:zoho.in ~all`. One SPF record per name.

DMARC, on `_dmarc.{{DOMAIN}}`:

```
v=DMARC1; p=none; rua=mailto:dmarc@{{DOMAIN}}; adkim=s; aspf=r; fo=1
```

Start at `p=none` and read the reports. After 2–4 clean weeks, move to `p=quarantine`.

Check: send a contact-form auto-reply to the address <https://www.mail-tester.com> gives you.
The score must be at least 9/10.
