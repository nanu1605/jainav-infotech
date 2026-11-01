# Launch 1: the company website goes live

Phase 6 in order (spec §20). Each step names who does it. Details are in the other runbooks.

## Before: inputs from Tanishq (spec §21)

- [ ] Domain (`{{DOMAIN}}`) added to Cloudflare, nameservers switched.
- [ ] VPS account; Cloudflare account; Resend account; mailbox provider; Telegram bot.
- [ ] Final company details:
  - CIN, incorporation date, registered office, GSTIN if any;
  - phone and email addresses, business days.
- [ ] Approved legal texts: privacy, terms, cancellation & refunds, shipping. Also the EULA if a
      VYRO download goes live (VYRO is MIT/Apache today, so it may not be needed).

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
   - in Settings → Site settings, enter the CIN and the Grievance Officer's name and title, in
     English and Hindi: until then the footer leaves them out without saying so;
   - publish the reviewed content.
8. **Legal pages:** the Owner publishes the approved texts (spec §8.13). Razorpay checks six
   pages: Contact, Pricing, Terms, Privacy, Cancellation & Refunds, Shipping.
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
- [ ] After a second deploy, `journalctl CONTAINER_NAME=jainav-app-1` still shows the first
      deploy's lines ([monitoring.md](monitoring.md#logs)).
- [ ] The home page's footer shows the CIN, registered office, email, phone and Grievance Officer,
      on `/` and `/hi`.
- [ ] An uptime alert reaches Telegram (pause a monitor's target, or use the provider's test
      alert).
- [ ] mail-tester scores at least 9/10.
- [ ] The six pages Razorpay checks are live.
- [ ] Lighthouse on the production URLs: `LHCI_BASE_URL=https://{{DOMAIN}} pnpm lhci` (spec
      §15; Phase 5 measured locally only).

**After launch (Tanishq):** once the pricing page shows real VYRO prices, apply for Razorpay
activation using this website.
