# Cloudflare, R2 and email DNS

Everything public goes through Cloudflare (spec §16, §18.6). `jainavinfotech.in` is the company domain.
Do these in the Cloudflare dashboard for the domain's zone.

## DNS

| Name                       | Type                                                                  | Value                                                             | Proxy    |
| -------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| `jainavinfotech.in` (apex) | A                                                                     | the VPS                                                           | proxied  |
| `www`                      | A                                                                     | the VPS's IPv4 address (Caddy redirects to the apex with a 308)   | proxied  |
| `staging`                  | A                                                                     | the VPS                                                           | proxied  |
| `analytics`                | A                                                                     | the VPS (Umami)                                                   | proxied  |
| `ssh`                      | created by the tunnel ([SSH tunnel](#ssh-tunnel))                     | the VPS's SSH, behind Access                                      | proxied  |
| `status`                   | CNAME                                                                 | the uptime monitor's status page ([monitoring.md](monitoring.md)) | DNS only |
| `cdn`                      | R2 custom domain on the public bucket (media)                         |                                                                   | proxied  |
| `downloads`                | R2 custom domain on the public bucket (installers under `downloads/`) |                                                                   | proxied  |
| `cdn-staging`              | R2 custom domain on staging's public bucket (media and installers)    |                                                                   | proxied  |
| mail records               | see [Email](#email)                                                   |                                                                   | DNS only |

All the site names are **A records only**: no AAAA record anywhere, because the origin takes no IPv6 traffic. Nothing that is DNS-only points at the server: a DNS-only record would show its address and let anyone connect around Cloudflare. Mail and `status` records point at the mail provider and the status page, never at the VPS.

The zone moved from GoDaddy on 2026-11-11, nameservers only: the registration and the mailbox stay
at GoDaddy. Of GoDaddy's records only the mail records stay ([Email](#email)). Its parking `A`
record on the apex, its `www` CNAME and its `_domainconnect` CNAME go; the apex and `www` get the
A records in the table above at launch.

## SSL

- SSL/TLS → Overview: **Full (strict)**.
- SSL/TLS → Origin Server → Create Certificate → _Use my private key and CSR_, hostnames
  `jainavinfotech.in` and `*.jainavinfotech.in`, 15 years. The CSR is made on the server, so the private key
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
- **Cloudflare Access** (Zero Trust → Access controls → Applications → Create new application →
  Self-hosted and private). One application, with these paths:
  - `jainavinfotech.in/admin` and `jainavinfotech.in/admin/*`
  - `jainavinfotech.in/api/users/*`
  - the same three paths on `staging.jainavinfotech.in`

  Policy: _Allow_, include the emails of the people who run the site (a policy made as in
  [SSH tunnel](#ssh-tunnel) step 5; `admins` if they are the same people); login method One-time
  PIN only (step 3 there); session 24 hours. Payload's own login (5 attempts, then a 15-minute
  lock) still applies behind it. Afterwards set the repository variables
  `STAGING_SMOKE_ADMIN_ACCESS` and `PRODUCTION_SMOKE_ADMIN_ACCESS` to `1`: the smoke tests then
  check that `/admin` redirects to `cloudflareaccess.com`.

## SSH tunnel

The VPS's SSH port stays closed to the internet. Deploys from GitHub, and your own sessions,
reach it through a Cloudflare Tunnel. Order of work: the tunnel, the Access application with its
policies, the connector on the server, the route, then a check from outside. The application comes
before the route because until `install.sh --harden` runs, sshd still accepts root and password
logins: the hostname must never be reachable without Access in front of it.

1. **Zero Trust onboarding.** The first visit asks for a team name, then a plan: choose Zero Trust
   Free. It still asks for a payment method; the Free plan isn't charged. Below, `<team>` is the
   team name.
2. **The tunnel.** Networking → Tunnels → Create a tunnel, type Cloudflared, name `jainav-vps`,
   then Create Tunnel. The next page shows install commands and an "Install as service" box with
   `sudo cloudflared service install <token>`, the token masked. Take only the token, with that
   box's copy button: don't run Cloudflare's install commands (the kit installs its own pinned
   `cloudflared`, checked against its sha256) and don't click Cancel. The Continue button stays
   disabled until a connector has connected; that is expected. Connect the server in step 7 and
   add the route in step 8, from the tunnel's own page.
3. **One-time PIN.** It isn't enabled in a new organization. Integrations → Identity providers →
   Add new identity provider → One-time PIN. In each Access application, select One-time PIN as the
   only login method.
4. **The service token.** Access controls → Service credentials → Service Tokens → Create Service
   Token. Name `github-deploy-jainav` (one token per app that deploys), Service Token Duration 1
   year, then Generate token. The Client ID and Client Secret are shown once: keep both in the
   password manager. They become that app's GitHub environment secrets `CF_ACCESS_CLIENT_ID` and
   `CF_ACCESS_CLIENT_SECRET` ([server.md §4](server.md#4-github-setup-once)). Add a notification
   (Notifications → Expiring Access Service Token) so Cloudflare warns a week before a token
   expires. Refresh on the token extends it by a year.
5. **The policies**, made once and reused. Access controls → Policies → Add a policy:
   - `admins`: Action Allow, Include → Emails → the people who run the server.
   - `deploy-tokens`: Action Service Auth, Include → Service Token → every `github-deploy-<app>`
     token. The Service Token selector appears only once the Action is Service Auth. Service
     tokens go in a Service Auth policy, never in an Allow policy.

   Service Auth and Bypass policies are evaluated before Allow and Block.

6. **The application.** Access controls → Applications → Create new application → Self-hosted and
   private → Add public hostname: subdomain `ssh`, domain `jainavinfotech.in`. Name it
   `jainav-ssh`. Attach both policies (`admins`, `deploy-tokens`), login method One-time PIN only,
   session duration 24 hours.
7. **The connector, on the server**, as in [server.md §1 step 9](server.md#1-provision-the-vps),
   with the token from the copy button. The connector only makes outbound connections and is never
   auto-updated; update it by hand within a year of Cloudflare's latest release.
8. **The route, last.** The tunnel → Routes → Add route → Published application. Subdomain `ssh`,
   Domain `jainavinfotech.in`, Path empty, Service URL `ssh://localhost:22`. The Service URL is one
   field and includes the scheme; Add route stays disabled while it is empty. Cloudflare creates
   the proxied `ssh` DNS record itself.
9. **Check from outside**, right after adding the route:

   ```bash
   curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://ssh.jainavinfotech.in/
   ```

   It must print `302` and a URL on `<team>.cloudflareaccess.com` (the Access login page). If it
   doesn't, delete the route at once. A WebSocket upgrade request gets the same 302.

10. **Your machine:** install `cloudflared`, add the `Host jainav` block, pre-trust the host keys
    and log in as in [server.md §1](server.md#1-provision-the-vps), steps 10 and 11.
11. Once `ssh jainav` works, close port 22 in Hostinger's firewall (hPanel → VPS → Security →
    Firewall) and run `install.sh --harden` ([server.md §1](server.md#1-provision-the-vps)).

## R2

Create these buckets (R2 → Create bucket, location hint Asia-Pacific):

| Bucket                                            | Public                                         | Used for                                       | Env vars                                                 |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `jainav-public`                                   | custom domains `cdn.` and `downloads.`         | media, installers                              | `S3_BUCKET`, `NEXT_PUBLIC_CDN_URL`, `DOWNLOADS_BASE_URL` |
| `jainav-private`                                  | no                                             | CVs, later invoices                            | `S3_PRIVATE_BUCKET`                                      |
| `jainav-backups`                                  | no                                             | encrypted database dumps and settings archives | `BACKUP_BUCKET` (server `.env`)                          |
| `jainav-staging-public`, `jainav-staging-private` | custom domain `cdn-staging.` on the public one | staging's files, kept apart                    | staging.env                                              |

Staging uses `https://cdn-staging.jainavinfotech.in` for the repository variable `STAGING_CDN_URL` and for
`NEXT_PUBLIC_CDN_URL` and `DOWNLOADS_BASE_URL` in staging.env (installers sit under `downloads/` in
the same bucket). Without it, staging's media and installer links 404.

API tokens (R2 → Manage API tokens), each _Object Read & Write_ on the named buckets only:

- the app (production): `jainav-public`, `jainav-private`;
- the app (staging): the two staging buckets;
- backups: `jainav-backups`.

`S3_ENDPOINT` / `BACKUP_S3_ENDPOINT` is `https://<account-id>.r2.cloudflarestorage.com`,
`S3_REGION=auto`.

## Turnstile

Turnstile → Add widget for `jainavinfotech.in` and `staging.jainavinfotech.in`, managed mode. The site key goes
in the repository variables `STAGING_TURNSTILE_SITE_KEY` / `PRODUCTION_TURNSTILE_SITE_KEY`, the secret in
`TURNSTILE_SECRET_KEY` (production.env / staging.env).

## Email

Two kinds of mail, kept apart:

- **The site's mail** (auto-replies, alerts, newsletter): sent by Resend from a subdomain.
  Resend → Domains → Add `send.jainavinfotech.in` (or the name Resend suggests) and create the records
  it lists: its DKIM `TXT`, plus the `MX` and SPF `TXT` (`v=spf1 include:amazonses.com ~all`)
  on its return-path subdomain. `EMAIL_FROM` is an address on that domain.
- **Mailboxes** (hello@, sales@, support@, careers@, privacy@, and dmarc@ for the DMARC reports
  below): GoDaddy's email, bought with the domain. In GoDaddy's email settings, make each address
  reach the mailbox, as a mailbox of its own, an alias or a forward.

GoDaddy's mail records came over with the zone. Keep their values and set every one to **DNS only**
(the import had proxied `email`):

| Name                 | Type  | Value                                                           |
| -------------------- | ----- | --------------------------------------------------------------- |
| `jainavinfotech.in`  | MX    | `smtp.secureserver.net`, priority 0                             |
| `jainavinfotech.in`  | MX    | `mailstore1.secureserver.net`, priority 10                      |
| `jainavinfotech.in`  | TXT   | `v=spf1 include:secureserver.net -all`                          |
| `_autodiscover._tcp` | SRV   | `autodiscover.secureserver.net`, port 443, priority 0, weight 0 |
| `email`              | CNAME | `email.secureserver.net`                                        |

One SPF record per name: the apex keeps GoDaddy's, and Resend's goes on its own subdomain. The SRV
record lets mail apps find their settings. `email` is GoDaddy's webmail shortcut, but GoDaddy has
no certificate for our name, so it only works over plain HTTP, and browsers that have seen the
site's HSTS header (`includeSubDomains`) refuse plain HTTP for it. Open webmail at
<https://email.secureserver.net> instead. If GoDaddy's email settings ever report its records
missing, compare the zone with this table before changing anything.

DMARC, on `_dmarc.jainavinfotech.in`. Until launch the zone keeps GoDaddy's own record
(`v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`), whose
reports go to GoDaddy. At launch step 11 ([launch.md](launch.md)), replace it with ours:

```
v=DMARC1; p=none; rua=mailto:dmarc@jainavinfotech.in; adkim=s; aspf=r; fo=1
```

Start at `p=none` and read the reports. After 2–4 clean weeks, move to `p=quarantine`.

Check: send a contact-form auto-reply to the address <https://www.mail-tester.com> gives you.
The score must be at least 9/10.
