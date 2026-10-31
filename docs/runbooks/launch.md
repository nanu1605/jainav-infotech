# Launch 1: the company website goes live

Phase 6 in order (spec §20). Each step names who does it. Details are in the other runbooks.

## Before: inputs from Tanishq (spec §21)

- [ ] Domain (`{{DOMAIN}}`) added to Cloudflare, nameservers switched.
- [ ] VPS account; Cloudflare account; Resend account; mailbox provider; Telegram bot.
- [ ] Final company details:
  - CIN, incorporation date, registered office, GSTIN if any;
  - phone and email addresses, business days;
  - the Grievance Officer's name and title.
- [ ] Legal texts reviewed, ideally by a lawyer: drafts are in `scripts/seed/legal/`, and the seed
      loads them. Decide the refund window and fill the other `{{PLACEHOLDERS}}`. The EULA waits for
      VYRO Pro: released builds are MIT or Apache-2.0 ([decisions](../decisions.md), "Legal drafts").

## Steps

1. **Cloudflare** ([cloudflare.md](cloudflare.md)):
   - DNS records, SSL Full (strict), Origin CA certificate;
   - Bot Fight Mode off, the WAF skip rule;
   - R2 buckets, custom domains and tokens; a Turnstile widget.
2. **Backup key** ([backups.md](backups.md#the-key)): make it now. The server's `.env` needs its
   public half before anything starts.
3. **Server** ([server.md](server.md)):
   - provision it, with the SSH tunnel ([cloudflare.md](cloudflare.md#ssh-tunnel));
   - firewall: 443 from Cloudflare's IP ranges, 22 closed;
   - put the files and env files in place, then start postgres, umami, caddy and backup.
4. **GitHub** ([server.md §4](server.md#4-github-setup-once)):
   - repository variables and secrets, and the environments' secrets;
   - the production reviewer;
   - `DEPLOY_ENABLED=true`.
5. **Staging:**
   - merge to `main` and confirm the deploy and smoke tests pass;
   - seed staging, publish its content in the admin, then click through it.
6. **Cloudflare Access** on `/admin*` and `/api/users/*`, then set `STAGING_SMOKE_ADMIN_ACCESS`
   and `PRODUCTION_SMOKE_ADMIN_ACCESS` to `1`.
7. **Production:**
   - tag `v1.0.0`, approve the deploy, seed;
   - create the Owner account in the admin;
   - publish the reviewed content.
8. **Legal pages:**
   - on staging, in a fresh browser profile, list the cookies and storage on the main pages and
     compare them with the Cookie Policy: the development check can't see Cloudflare or Umami;
   - the Owner publishes the reviewed texts with their effective date (spec §8.13), all but the
     EULA, and sets the Terms version in Commerce settings to match;
   - Razorpay's activation asks for About us, Contact us, Pricing, Terms, Privacy and Refunds, plus
     a sample invoice. Shipping stays live too.
9. **VYRO download** (if it goes live): `pnpm import:release <tag>` with the tools image
   ([server.md §8](server.md#8-one-off-commands)), then the Owner publishes the release.
10. **Email** ([cloudflare.md](cloudflare.md#email)): Resend domain verified, mailboxes, SPF,
    DKIM, DMARC `p=none`.
11. **Monitoring** ([monitoring.md](monitoring.md)):
    - uptime monitors, status page and Telegram alerts;
    - Sentry DSN;
    - Umami: password changed, website ID set.
12. **Backups** ([backups.md](backups.md)): run one backup and one restore test on the server.

## Done when (spec §20)

- [ ] Production runs on HTTPS with A-grade security headers (<https://securityheaders.com>).
- [ ] `/admin` requires Cloudflare Access (the smoke test checks it).
- [ ] A restore test succeeds on the server.
- [ ] An uptime alert reaches Telegram (pause a monitor's target, or use the provider's test
      alert).
- [ ] mail-tester scores at least 9/10.
- [ ] The pages Razorpay checks are live (step 8).
- [ ] Lighthouse on the production URLs: `LHCI_BASE_URL=https://{{DOMAIN}} pnpm lhci` (spec
      §15; Phase 5 measured locally only).

**After launch (Tanishq):** once the pricing page shows real VYRO prices, apply for Razorpay
activation using this website. First get Razorpay's written confirmation that one-time software
licenses are accepted: its merchant terms name "software download" among prohibited intangible goods
([decisions](../decisions.md), "Legal drafts").
