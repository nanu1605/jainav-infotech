# Cloudflare, R2 and email DNS

Everything public goes through Cloudflare (spec §16, §18.6). `{{DOMAIN}}` is the company domain.
Do these in the Cloudflare dashboard for the domain's zone.

## DNS

| Name                | Type                                                                  | Value                                                             | Proxy    |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| `{{DOMAIN}}` (apex) | A                                                                     | the VPS                                                           | proxied  |
| `www`               | A                                                                     | the VPS's IPv4 address (Caddy redirects to the apex with a 308)   | proxied  |
| `staging`           | A                                                                     | the VPS                                                           | proxied  |
| `analytics`         | A                                                                     | the VPS (Umami)                                                   | proxied  |
| `ssh`               | created by the tunnel ([SSH tunnel](#ssh-tunnel))                     | the VPS's SSH, behind Access                                      | proxied  |
| `status`            | CNAME                                                                 | the uptime monitor's status page ([monitoring.md](monitoring.md)) | DNS only |
| `cdn`               | R2 custom domain on the public bucket (media)                         |                                                                   | proxied  |
| `downloads`         | R2 custom domain on the public bucket (installers under `downloads/`) |                                                                   | proxied  |
| `cdn-staging`       | R2 custom domain on staging's public bucket (media and installers)    |                                                                   | proxied  |
| mail records        | see [Email](#email)                                                   |                                                                   | DNS only |

All the site names are **A records only**: no AAAA record anywhere, because the origin takes no IPv6 traffic. Nothing that is DNS-only points at the server: a DNS-only record would show its address and let anyone connect around Cloudflare. Mail and `status` records point at the mail provider and the status page, never at the VPS.

## SSL

- SSL/TLS → Overview: **Full (strict)**.
- SSL/TLS → Origin Server → Create Certificate → _Use my private key and CSR_, hostnames
  `{{DOMAIN}}` and `*.{{DOMAIN}}`, 15 years. The CSR is made on the server, so the private key
  never leaves it ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)). The
  certificate and key live in `/srv/edge/certs/jainav/` (`origin.pem`, `origin-key.pem`), installed with
  `sudo app-apply edge cert jainav …`. Caddy serves it for every site of the zone; browsers never see
  it, only Cloudflare does.
- **Authenticated Origin Pulls**: SSL/TLS → Origin Server → Authenticated Origin Pulls →
  _Zone-level_, with our own client certificate (not Cloudflare's shared one), then turned on.
  It must be on for every zone before a second app runs on the server
  ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)). It has no effect on the
  `ssh.` tunnel hostname.
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

- **Origin firewall:** only Cloudflare reaches the VPS, in four layers: Hostinger's firewall in
  hPanel (443 from Cloudflare's ranges; nothing else open once SSH runs through the tunnel), the
  host's own rules, Caddy's trusted proxies and authenticated origin pulls
  ([edge.md §1](edge.md#1-how-the-edge-works)). When Cloudflare changes its ranges, change them in
  hPanel too ([edge.md §4](edge.md#4-cloudflares-ranges-and-the-origin-firewall)). That is also why the app can trust the
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
   the install command it shows on the VPS: the pinned `cloudflared` release the kit names, checked against its published sha256
   ([server.md §1](server.md#1-provision-the-vps)), then `cloudflared service install` with the
   token read from a file, not typed in a command line. The connector only makes outbound
   connections and is never auto-updated; update it by hand within a year of Cloudflare's latest
   release.
2. In the tunnel, add a public hostname `ssh.{{DOMAIN}}` with service `ssh://localhost:22`.
3. Zero Trust → Access → Service Auth → Create one service token per app that deploys:
   `github-deploy-jainav` here, and another for each further app. Each token's client ID and
   secret go in that app's GitHub environment secrets `CF_ACCESS_CLIENT_ID` and
   `CF_ACCESS_CLIENT_SECRET` ([server.md §4](server.md#4-github-setup-once)).
4. Access → Applications → Add → Self-hosted, domain `ssh.{{DOMAIN}}`, two policies:
   - _Service Auth_: include every `github-deploy-<app>` token;
   - _Allow_: include your own email, for interactive sessions.
5. On your machine, install `cloudflared` and add the `Host jainav` block from
   [server.md §1](server.md#1-provision-the-vps). `ssh jainav` opens a browser sign-in the
   first time.
6. Once `ssh jainav` works, close port 22 in Hostinger's firewall (hPanel → VPS → Security →
   Firewall) and run `install.sh --harden` ([server.md §1](server.md#1-provision-the-vps)).

## R2

Create these buckets (R2 → Create bucket, location hint Asia-Pacific):

| Bucket                                            | Public                                         | Used for                                       | Env vars                                                 |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `jainav-public`                                   | custom domains `cdn.` and `downloads.`         | media, installers                              | `S3_BUCKET`, `NEXT_PUBLIC_CDN_URL`, `DOWNLOADS_BASE_URL` |
| `jainav-private`                                  | no                                             | CVs, later invoices                            | `S3_PRIVATE_BUCKET`                                      |
| `jainav-backups`                                  | no                                             | encrypted database dumps and settings archives | `BACKUP_BUCKET` (server `.env`)                          |
| `jainav-staging-public`, `jainav-staging-private` | custom domain `cdn-staging.` on the public one | staging's files, kept apart                    | staging.env                                              |

Staging uses `https://cdn-staging.{{DOMAIN}}` for the repository variable `STAGING_CDN_URL` and for
`NEXT_PUBLIC_CDN_URL` and `DOWNLOADS_BASE_URL` in staging.env (installers sit under `downloads/` in
the same bucket). Without it, staging's media and installer links 404.

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
