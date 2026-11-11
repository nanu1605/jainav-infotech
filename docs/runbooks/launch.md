# Launch 1: the company website goes live

Phase 6 in order (spec §20). Each step names who does it. Details are in the other runbooks.

## Before: inputs from Tanishq (spec §21)

- [ ] Domain (`jainavinfotech.in`) added to Cloudflare, nameservers switched.
- [ ] Hostinger account with two-factor login; Cloudflare account; Resend account; mailbox
      provider; Telegram bots (one for the server, one for the site).
- [ ] Final company details:
  - CIN, incorporation date, registered office, GSTIN if any;
  - phone and email addresses, business days;
  - the Grievance Officer's name and title.
- [ ] Legal texts reviewed, ideally by a lawyer: drafts are in `scripts/seed/legal/`, and the seed
      loads them. Decide the refund window and fill the other `{{PLACEHOLDERS}}`. The EULA waits for
      VYRO Pro: released builds are MIT or Apache-2.0 ([decisions](../decisions.md), "Legal drafts").

## The server in short

One Hostinger KVM 4 runs this site and a second app behind one Caddy edge that only Cloudflare can
reach. Its files are the shared-server kit in `docker/host` and `docker/edge`. The server's own
steps are in [server.md](server.md) and [edge.md](edge.md); this list gives the order.

## Steps

1. **Cloudflare** ([cloudflare.md](cloudflare.md)):
   - SSL Full (strict), the Origin CA certificate, the tunnel for SSH and its Access application;
   - Bot Fight Mode off, the WAF skip rule;
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
   - put the files and env files in place ([server.md §2](server.md#2-put-the-files-in-place));
   - the edge, then the first start: certificate, `edge.env`, ranges, site file, postgres, umami,
     the backup image and the timers ([server.md §3](server.md#3-first-start));
   - the site's DNS records now, proxied;
   - the leak test ([edge.md §6](edge.md#6-the-leak-test)).
5. **GitHub** ([server.md §4](server.md#4-github-setup-once)):
   - repository variables and secrets, and the environments' secrets (`DEPLOY_USER` is
     `deploy-jainav`, with a separate key for each environment);
   - staging limited to `main`; the production reviewer and tag rule;
   - `DEPLOY_ENABLED=true`.
6. **Staging:**
   - merge to `main` and confirm the deploy and smoke tests pass;
   - seed staging, publish its content in the admin, then click through it.
7. **Cloudflare Access** on `/admin*` and `/api/users/*`, then set `STAGING_SMOKE_ADMIN_ACCESS`
   and `PRODUCTION_SMOKE_ADMIN_ACCESS` to `1`. Access is in place before the first production
   deploy.
8. **Production:**
   - tag `v1.0.0`, approve the deploy, seed;
   - create the Owner account in the admin;
   - in Settings → Site settings, enter the CIN and the Grievance Officer's name and title, in
     English and Hindi: until then the footer leaves them out without saying so. The Privacy,
     Privacy Requests, Terms and Refunds pages name the officer in their text too, so a new officer
     means publishing new versions of them as well;
   - publish the reviewed content.
9. **Legal pages:**
   - on staging, in a fresh browser profile, list the cookies and storage on the main pages and
     compare them with the Cookie Policy: the development check can't see Cloudflare or Umami;
   - the Owner publishes the reviewed texts with their effective date (spec §8.13), all but the
     EULA, and sets the Terms version in Commerce settings to match;
   - Razorpay's activation asks for About us, Contact us, Pricing, Terms, Privacy and Refunds, plus
     a sample invoice. Shipping stays live too.
10. **VYRO download** (if it goes live): `sudo app-compose jainav tools production - pnpm import:release <tag>`
    ([server.md §8](server.md#8-one-off-commands)), then the Owner publishes the release.
11. **Email** ([cloudflare.md](cloudflare.md#email)): Resend domain verified, the mailbox
    addresses, SPF, DKIM, and our DMARC record (`p=none`) in place of GoDaddy's.
12. **Monitoring** ([monitoring.md](monitoring.md)):
    - HetrixTools monitors, heartbeats, status page and Telegram alerts, with one test alert of
      each kind;
    - Sentry DSN;
    - Umami: password changed, website ID set.
13. **Backups** ([backups.md](backups.md)): run one backup and one restore test on the server, then
    set the bucket locks ([backups.md](backups.md#bucket-locks)).

## Gates before the first production deploy

- **Authenticated origin pulls** are on for the site's zone and tested, and stay on for every zone
  before a second app's containers run on the server
  ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)).

## Done when (spec §20)

- [ ] Production runs on HTTPS with A-grade security headers (<https://securityheaders.com>).
- [ ] `/admin` requires Cloudflare Access (the smoke test checks it).
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
- [ ] mail-tester scores at least 9/10.
- [ ] The pages Razorpay checks are live (step 9).
- [ ] Lighthouse on the production URLs: `LHCI_BASE_URL=https://jainavinfotech.in pnpm lhci` (spec
      §15; Phase 5 measured locally only).

**After launch (Tanishq):** once the pricing page shows real VYRO prices, apply for Razorpay
activation using this website. First get Razorpay's written confirmation that one-time software
licenses are accepted ([decisions](../decisions.md), "Legal drafts").
