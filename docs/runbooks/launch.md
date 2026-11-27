# Launch 1: the company website goes live

Phase 6 in order (spec §20). Each step names who does it. Details are in the other runbooks.

## Before: inputs from Tanishq (spec §21)

- [x] Domain (`jainavinfotech.in`) added to Cloudflare, nameservers switched (2026-11-11).
- [ ] Hostinger account with two-factor login; Cloudflare account; Resend account; the mailbox
      (GoDaddy email, bought with the domain); Telegram bots (one for the server, one for the site).
- [x] Final company details (2026-11-26), in the seed and the legal drafts:
  - CIN, registered office, GSTIN; the incorporation date is optional and still unset;
  - phone and email addresses, business days;
  - the Grievance Officer's name and title.
- [ ] Legal texts reviewed, ideally by a lawyer: drafts are in `scripts/seed/legal/`, and the seed
      loads them. The refund window is 7 days (2026-11-26); fill the other `{{PLACEHOLDERS}}`.
      There is no EULA to review: since 2026-11-27 Clokrix is sold and licensed on its own site,
      and the seed has no EULA ([decisions](../decisions.md), "Clokrix sells on its own site").

## The server in short

One Hostinger KVM 4 runs this site and a second app behind one Caddy edge that only Cloudflare can
reach. Its files are the shared-server kit in `docker/host` and `docker/edge`. The server's own
steps are in [server.md](server.md) and [edge.md](edge.md); this list gives the order.

## Steps

1. **Cloudflare** ([cloudflare.md](cloudflare.md)):
   - SSL Full (strict), the Origin CA certificate, the tunnel for SSH and its Access application;
   - Bot Fight Mode off, the WAF skip rule, Cloudflare's analytics beacon off;
   - the Access application for `/admin`, `/admin/*`, `/api/users` and `/api/users/*`, on the apex
     and on staging, with its eager redirect cookie off
     ([cloudflare.md](cloudflare.md#security)). It exists before any DNS record of the site, and
     so before the staging Owner account;
   - R2 buckets, custom domains and tokens; a Turnstile widget;
   - the site's DNS records wait for step 4: the server's IP goes into Cloudflare and hPanel only.
2. **Backup key** ([backups.md](backups.md#the-key)): make it now. The server's `.env` needs its
   public half before anything starts.
3. **Buy the server** (Tanishq): Hostinger KVM 4 for 24 months, plain Ubuntu 24.04 with your SSH
   key, and a strong root password kept in the password manager (it is for the Web Console, which
   does not use SSH). **Location: Mumbai 2**: the cart pre-selects Malaysia, so change it. Then, in
   hPanel:
   - Backups: turn off automatic backups (they are unencrypted images of the whole VPS, both apps
     included);
   - a firewall group allowing TCP 443 from Cloudflare's ranges, and TCP 22 from your own IPv4
     until the tunnel works ([edge.md §4](edge.md#4-cloudflares-ranges-and-the-origin-firewall)).
4. **Server**, in this order:
   - provision it as root, install the kit, connect the tunnel and test the `ops` login
     ([server.md §1](server.md#1-provision-the-vps));
   - check that a Web Console login works, then harden, as the last step of the provisioning
     ([server.md §9](server.md#9-break-glass));
   - the edge, then the files and env files: ranges, `edge.env`, certificate, site file, then
     Jainav's env files and `/etc/hostwatch.env`
     ([server.md §2](server.md#2-put-the-files-in-place));
   - the first start: postgres, umami and its new password, the backup image, the settings
     archive, the checks and the timers ([server.md §3](server.md#3-first-start));
   - the DNS records for `staging` and `analytics` now, proxied, and only once Umami's default
     password is changed: the `analytics` record makes Umami's login page public. The apex and
     `www` wait for step 8;
   - from outside: the Access check on staging ([cloudflare.md](cloudflare.md#security)), and the
     leak test's log line ([edge.md §6](edge.md#6-the-leak-test), step 2). Its step 3 is part of
     [server.md §3](server.md#3-first-start); steps 1 and 4 come with authenticated origin pulls
     ([Gates](#gates-before-the-first-production-deploy)).
5. **GitHub** ([server.md §4](server.md#4-github-setup-once)):
   - repository variables and secrets, and the environments' secrets (`DEPLOY_USER` is
     `deploy-jainav`, with a separate key for each environment);
   - staging limited to `main`; the production reviewer and tag rule;
   - `STAGING_SMOKE_ADMIN_ACCESS=1`: Access is in place since step 1;
   - `DEPLOY_ENABLED=true`.
6. **Staging deploy:** merge to `main`, or run the Deploy workflow on `main`, and confirm that the
   deploy and the smoke tests pass. The smoke tests need no content, so they pass on the first
   deploy's empty database.
7. **Staging content:**
   - seed it: `sudo app-compose jainav tools staging - pnpm seed`
     ([server.md §8](server.md#8-one-off-commands)). It ends with
     "Seed complete: … created, … already present." and creates no user;
   - create the Owner account at `https://staging.jainavinfotech.in/admin`, past Access and
     staging's basic auth: the first user becomes the Owner;
   - publish what the seed saved as drafts: Products (sidebar group Products), Services and Pages
     (group Content). Per collection, tick the header checkbox, click Publish, then
     "Confirm publish" in the drawer; it publishes English and Hindi together. Team and FAQs are
     seeded published, the seed creates no plans, and posts, jobs and docs stay empty. Legal
     Pages stay drafts until step 9, so their footer links answer 404 on staging. The `/clokrix`,
     `/vyro` and `/products/vyro` redirects work once Clokrix is published;
   - click through it.
8. **Production:**
   - the apex and `www` DNS records, proxied; the Access check on the apex
     ([cloudflare.md](cloudflare.md#security)); then `PRODUCTION_SMOKE_ADMIN_ACCESS=1`;
   - tag `v1.0.0`, approve the deploy, seed;
   - create the Owner account in the admin;
   - check Settings → Site settings: the seed fills the CIN, GSTIN, hours and the Grievance
     Officer's name and title, in English and Hindi (a database seeded before 2026-11-26, such as
     staging, needs them entered there), and the footer leaves out any that are empty without
     saying so. The Privacy, Privacy Requests, Terms and Refunds pages name the officer in
     their text too, so a new officer means publishing new versions of them as well;
   - publish the reviewed content.
9. **Legal pages:**
   - on staging, in a fresh browser profile, list the cookies and storage on the main pages and
     compare them with the Cookie Policy: the development check can't see Cloudflare or Umami;
   - the Owner publishes the reviewed texts with their effective date (spec §8.13), and sets the
     Terms version in Commerce settings to match. The seed has had no EULA since 2026-11-27, so
     there is none to hold back;
   - Razorpay's activation asks for About us, Contact us, Pricing, Terms, Privacy and Refunds, plus
     a sample invoice. Shipping stays live too. The activation itself waits for a product this
     store sells ("After launch", below).
10. **Clokrix download:** nothing to import. Clokrix's Download link goes to its own site,
    `https://clokrix.jainavinfotech.in/download`, which always serves the newest build, the copy
    the app updates from (2026-11-27).
11. **Email** ([cloudflare.md](cloudflare.md#email)): Resend domain verified, the mailbox
    addresses, SPF, DKIM, and our DMARC record (`p=none`) in place of GoDaddy's. The emails'
    header icon shows in the first production mail (staging's basic auth blocks it there).
12. **Monitoring** ([monitoring.md](monitoring.md)):
    - HetrixTools monitors, heartbeats, status page and Telegram alerts, with one test alert of
      each kind;
    - Sentry DSN, and the relay test with an ad blocker on
      ([monitoring.md](monitoring.md#sentry-errors));
    - Umami: the default login is refused, the website is added and its ID is set
      ([monitoring.md](monitoring.md#umami-analytics)).
13. **Backups** ([backups.md](backups.md)): run one backup and one restore test on the server, then
    set the bucket locks ([backups.md](backups.md#bucket-locks)).

## Gates before the first production deploy

- **Cloudflare Access** on `/admin`, `/admin/*`, `/api/users` and `/api/users/*`, on the apex and
  on staging, is in place before the site's DNS records (step 1). Its outside check passes on each
  hostname before that environment's first deploy (steps 4 and 8).
- **Authenticated origin pulls** are on for the site's zone, and tested, before the first
  production deploy, and on for every zone before the first container of a second app runs on the
  server ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)). Jainav's zone has
  had them since 2026-11-25, with the leak test passed ([edge.md §6](edge.md#6-the-leak-test)).

## Done when (spec §20)

- [ ] Production runs on HTTPS with A-grade security headers (<https://securityheaders.com>).
- [ ] `/admin`, `/admin/*`, `/api/users` and `/api/users/*` require Cloudflare Access, on the apex
      and on staging (the smoke test checks `/admin`).
- [ ] The leak test passes: the origin answers nothing to a direct connection
      ([edge.md §6](edge.md#6-the-leak-test)).
- [ ] A restore test succeeds on the server.
- [ ] After a second deploy, `journalctl CONTAINER_NAME=jainav-app-1` still shows the first
      deploy's lines ([monitoring.md](monitoring.md#logs)).
- [ ] `sudo hostwatch check` is clean, and its heartbeat reaches the monitor.
- [ ] The home page's footer shows the CIN, registered office, email, phone and Grievance Officer,
      on `/` and `/hi`.
- [ ] An uptime alert reaches Telegram (pause a monitor's target, or use the provider's test
      alert).
- [ ] mail-tester scores at least 9/10, and the emails' header icon shows in the first production
      mail.
- [ ] The pages Razorpay checks are live (step 9).
- [ ] Lighthouse on the production URLs: `LHCI_BASE_URL=https://jainavinfotech.in pnpm lhci` (spec
      §15; Phase 5 measured locally only).

**After launch (Tanishq):** Razorpay's activation for this website waits for a product this store
sells. Clokrix doesn't count: since 2026-11-27 it is sold on its own site
([decisions](../decisions.md), "Clokrix sells on its own site"), so Launch 2 is on hold. Once such
a product's pricing page shows its real prices, apply for the activation using this website. First
get Razorpay's written confirmation that one-time software licenses are accepted
([decisions](../decisions.md), "Legal drafts").
