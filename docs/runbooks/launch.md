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
2. **Server** ([server.md](server.md)): provision it and set the firewall to Cloudflare's IP
   ranges. Put the files and env files in place, then start postgres, umami, caddy and backup.
3. **GitHub** ([server.md §4](server.md#4-github-setup-once)):
   - the environments with their variables and secrets;
   - the production reviewer;
   - `DEPLOY_ENABLED=true`.
4. **Staging:** merge to `main` and confirm the deploy and smoke tests pass. Seed staging, then
   click through it.
5. **Cloudflare Access** on `/admin*` and `/api/users/*`, then set `SMOKE_ADMIN_ACCESS=1`.
6. **Production:**
   - tag `v1.0.0`, approve the deploy, seed;
   - create the Owner account in the admin;
   - publish the reviewed content.
7. **Legal pages:** the Owner publishes the approved texts (spec §8.13). Razorpay checks six
   pages: Contact, Pricing, Terms, Privacy, Cancellation & Refunds, Shipping.
8. **VYRO download** (if it goes live): `pnpm import:release <tag>` with the tools image
   ([server.md §8](server.md#8-one-off-commands)), then the Owner publishes the release.
9. **Email** ([cloudflare.md](cloudflare.md#email)): Resend domain verified, mailboxes, SPF,
   DKIM, DMARC `p=none`.
10. **Monitoring** ([monitoring.md](monitoring.md)):
    - uptime monitors, status page and Telegram alerts;
    - Sentry DSN;
    - Umami: password changed, website ID set.
11. **Backups** ([backups.md](backups.md)): make the age key, then run one backup and one
    restore test.

## Done when (spec §20)

- [ ] Production runs on HTTPS with A-grade security headers (<https://securityheaders.com>).
- [ ] `/admin` requires Cloudflare Access (the smoke test checks it).
- [ ] A restore test succeeds on the server.
- [ ] An uptime alert reaches Telegram (pause a monitor's target, or use the provider's test
      alert).
- [ ] mail-tester scores at least 9/10.
- [ ] The six pages Razorpay checks are live.
- [ ] Lighthouse on the production URLs: `LHCI_BASE_URL=https://{{DOMAIN}} pnpm lhci` (spec
      §15; Phase 5 measured locally only).

**After launch (Tanishq):** once the pricing page shows real VYRO prices, apply for Razorpay
activation using this website.
