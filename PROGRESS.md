# Progress

Tasks from spec §20. Each phase ends with all checks green, a phase report, and approval before the next phase starts.

## Milestone A — Foundation

### Phase 0 — Setup and guardrails

- [x] Scaffold from `create-payload-app@3.90.2` (blank, Postgres) at the repository root. Payload 3.90.2; Next.js 16.3.8 (see decisions); Node 24.
- [x] Use the official `website` template as a reference (scaffolded outside the repo, not committed).
- [x] TypeScript strict, ESLint (`eslint .`), Prettier, Husky + lint-staged, commitlint.
- [x] Tokens pipeline: `brand.config.ts` → `pnpm tokens:build` → `tokens.css` + `tokens.generated.ts` with contrast checks; `globals.css` with `@custom-variant dark`, `@theme inline` and the default palette reset; `next-themes` (`data-theme`) without a flash.
- [x] `next-intl`: routing (§4.4), messages files, `proxy.ts` with the exclusions, `[locale]` layout that sets `lang`.
- [x] Fonts via `src/styles/fonts.ts` (Plus Jakarta Sans, Mukta).
- [x] `docker/compose.dev.yml` (Postgres) and `.env.example`.
- [x] Scripts: `check:tokens`, `check:i18n`; `SKIP_DB_AT_BUILD` handling.
- [x] GitHub Actions workflow for pull requests (with a Postgres service container).
- [x] `CLAUDE.md` (§3), `PROGRESS.md`, `docs/decisions.md`.

### Phase 1 — Content model and admin

- [x] Payload localization (`en`, `hi`, fallback on).
- [x] Collections: users (owner, editor, support; login lockout), media, installers, products, plans, releases, docs, services, pages, posts, changelog, testimonials, faqs, team, jobs, legalPages, shortLinks, leads, dataRequests, auditLog, dailyStats. Globals: siteSettings, navigation.
- [x] Page blocks (§8.2) and product blocks (§8.4) with localized inner text fields; product button fields and validation (§8.5); `hiStatus` (§6).
- [x] Release hooks: compute SHA-256 and size from the installer.
- [x] Access control (§9.3); GraphQL disabled; drafts on products, services, pages, posts, docs, jobs, legalPages, testimonials.
- [x] Plugins: SEO, redirects; R2 storage for media and installers (local disk in development).
- [x] Audit-log hooks; revalidation hooks for both locales (skipped when `req.context.disableRevalidate`).
- [x] Admin navigation groups; placeholder admin branding.
- [x] Idempotent seed script (sets `disableRevalidate`): settings with placeholders, navigation, pages, services, the products and plans in Appendix A, sample FAQs, legal drafts. English copy plus draft Hindi (`hiStatus = draft`).

### Phase 2 — Design system and motion

- [x] Components (§5.6) and motion primitives (word-based TextReveal; splits at whitespace, not `Intl.Segmenter`; see decisions).
- [x] Reduced-motion handling.
- [x] `/styleguide` (not in production).

## Milestone B — Company website live (Launch 1)

### Phase 3 — Public pages

- [x] Global layout: header + mega-menu, footer + legal block, announcement bar.
- [x] Home; Products hub (filters deferred until there are more than six products); product pages in both modes with every product block; button logic (§8.5); `/go/` redirects + counters; vanity redirects via the not-found handler (§8.6).
- [x] Live preview in both languages.
- [x] Hosted sub-pages: pricing (display only; buying disabled until `storeEnabled`), download, changelog, docs, support (FAQ + contact form, wired in Phase 4).
- [x] Download endpoints + counters and the Tauri update feed (§12.5).
- [x] Services (+ pillar pages), About, Contact (layout), Careers (+ JobPosting), Blog (+ RSS feeds), Changelog, Legal pages, 404 / 500 / maintenance.
- [x] SEO: metadata, canonical / hreflang / sitemap per §6, robots, JSON-LD; share images.

### Phase 4 — Forms, leads and notifications

- [x] `privateFiles` collection (private bucket, signed URLs).
- [x] All forms (§13) with Turnstile, rate limits, honeypot and consent records; newsletter double opt-in and one-click unsubscribe. (The privacy request form goes live with the `privacy-requests` legal page.)
- [x] Resend + React Email templates (English / Hindi): auto-replies, internal notifications, newsletter confirmation.
- [x] Telegram alerts.
- [x] Leads admin views and CSV export; data-request handling.
- [x] WhatsApp button; scheduler link.

### Phase 5 — Signature animations and polish

- [x] Home hero gradient mesh; MenuMesh, VYRO and Baby hero animations; feature scroller; product card effects; micro-interactions.
- [x] Performance tuning.
- [x] About: founder section with Tanishq's photo, a quote and the bio (seeded).

### Phase 6 — Deploy and launch the company website

In the repository (done; rehearsed locally, see docs/runbooks/server.md#rehearsal):

- [x] Docker images (runner + tools); `compose.prod.yml` (app, app-staging, postgres, umami, caddy, backup).
- [x] Per-environment image builds; deploy workflow (staging on `main`, production on `v*` tags after approval, automatic rollback, smoke tests); `prodMigrations` on container start via `/api/v1/health`.
- [x] Sentry and Umami wired in (off until configured); Telegram alerts from the backup job.
- [x] Backups + restore runbook; restore test passed locally.
- [x] Security headers / CSP (§16); `pnpm audit` in CI; Dependabot.
- [x] VYRO release import (`pnpm import:release`); v0.3.0 verified (SHA-256 `0dacbbaa…25dd3`) and imported into dev as a draft.
- [x] Runbooks: `docs/runbooks/` (launch, server, cloudflare, backups, monitoring).
- [x] Legal drafts in English and draft Hindi (`scripts/seed/legal/`), not yet approved; data map corrected against the code.

On the server and in accounts (needs Tanishq's inputs; order in docs/runbooks/launch.md):

- [ ] Before going live (docs/decisions.md, "October advisories"): happy-dom fix and Node image 24.22.1 or later (from 2026-11-04), Payload 3.92 or later (from 2026-11-05).
- [ ] Provision the VPS; firewall to Cloudflare's ranges.
- [ ] Cloudflare: DNS, SSL Full (strict), Origin CA certificate, WAF skip rule, Bot Fight Mode off, Access on `/admin*` and `/api/users/*`; R2 buckets + custom domains.
- [ ] GitHub environments, secrets, production reviewer, `DEPLOY_ENABLED`; staging and production live.
- [ ] Sentry project, Umami website, external uptime monitor + status page; an uptime alert reaches Telegram.
- [ ] A real restore test on the server.
- [ ] SPF / DKIM / DMARC; mail-tester ≥ 9/10.
- [ ] Legal review (docs/decisions.md, "Legal drafts"): blanks filled, then the Owner publishes every legal page but the EULA (§8.13). Final content check.
- [ ] VYRO download in production: `pnpm import:release <tag>` (v1.4.0 was imported into dev as a draft on 2026-10-18; the latest is now v2.0.4, whose features the seeded copy doesn't mention), then the Owner publishes it.
- [ ] Lighthouse on the production URLs (§15).

## Milestone C — VYRO store live (Launch 2)

### Phase 7 — Accounts, checkout and invoices (Razorpay test mode)

In the repository (done; tested locally against the stand-in gateway, see docs/decisions.md):

- [x] First: `docs/licensing-api.md` (§12.4), so VYRO app work can start in parallel.
- [x] `customers`, `otpChallenges`, `customerSessions`; email-code sign-in and sessions (§11.2); account pages (overview, orders & invoices, settings with account deletion); `customer` on `dataRequests`.
- [x] `orders`, `invoices`, `invoiceCounters`, `webhookEvents`, `coupons`; `commerceSettings`.
- [x] Checkout flow (§11.3): acceptance checkbox, verify, webhook, fulfilment transaction, post-commit jobs, paid-twice flagging, reconciliation job, success / failure pages; a local stand-in for Razorpay while no keys are set.
- [x] Tax engine, invoice numbering and PDF (§11.4); OTP and order-confirmation emails in English and Hindi (§11.7).
- [x] Refund and dispute events recorded on the order (effects in Phase 9).

With Tanishq's inputs (steps in docs/runbooks/store.md):

- [ ] Razorpay test keys and webhook on staging; a test-mode purchase end to end, including the webhook; CSP checked in the browser.
- [ ] VYRO plans and prices; from the CA: GST status, SAC code, export treatment, invoice prefix and format, signature line, how long orders and invoices are kept.

### Phase 8 — Licensing

In the repository (done; tested locally with development keys, see docs/decisions.md):

- [x] `licenses`, `activations`, `trials`.
- [x] Key generation, normalization and storage; licensing API (§12.4); JWT signing + JWKS; grace re-issue.
- [x] Fulfilment creates real licenses; the license key goes into the order email; new-device email.
- [x] Account: Licenses page with device deactivation; Downloads page.
- [x] Complimentary license issuing (the admin's Create form); `license-test-client`; `gen:licensing-keys`.

With Tanishq's inputs (steps in docs/runbooks/licensing.md):

- [ ] Licensing keys generated and installed on staging and production; the public key embedded in VYRO.
- [ ] Confirm the activation limit (2), monthly deactivations (3), trial length (14 days) and updates policy (12 months, builds in that window stay Pro).
- [ ] The test client run against staging.

### Phase 9 — Store operations

In the repository (done; tested locally with the stand-in gateway, see docs/decisions.md):

- [x] Refunds (Owner endpoint) and the `refund.processed` path: credit notes, license revocation, emails; `refund.failed` alerts.
- [x] Disputes: order `disputed`, license suspended, alert.
- [x] Resend license email; re-render invoice PDF; one-click refund for paid-twice orders.
- [x] Monthly CA report (invoices + credit notes + SAC summary); leads report. CSV only (XLSX needs a new dependency).
- [x] "Email this waitlist" (consented leads only).
- [x] Simple insights: `dailyStats` views + Umami link.

With Tanishq's inputs (steps in docs/runbooks/store.md):

- [ ] A test-mode refund from the admin and from Razorpay's dashboard on staging; the dispute and paid-twice paths if Razorpay's test mode can raise them.
- [ ] From the CA: the credit note layout, the CA report's columns (CSV or XLSX, rate-wise or B2B/B2C splits) and the refund window.

### Before the store opens: the store against the legal drafts

In the repository (done; see docs/decisions.md, "The store against the legal drafts"):

- [x] Checkout links the refund and delivery pages and refuses orders until its legal pages are live; copy matches the code in both languages.
- [x] Privacy requests: ticket numbers, due dates staff can correct, daily reminders, nomination.
- [x] The Owner's Delete account on a customer; unconfirmed newsletter sign-ups no longer count as consenting.
- [x] Retention: a lead's last contact and a purge of leads and CVs; settings for closed privacy requests, orders and invoices (off) and Umami data (off).
- [x] Alerts for two paid orders for one plan; emails for a failed refund and a reinstated license; a dispute's end clears Disputed; the CA report lists lost disputes.

With inputs (steps in docs/runbooks/retention.md):

- [ ] From the lawyer: a period for closed privacy requests, and for analytics. Then set them and change the Privacy Policy.
- [ ] From the CA: the period for orders and invoices, then turn on their removal; how a lost chargeback is recorded.

### Phase 10 — Store go-live

- [ ] Switch to Razorpay live keys (after activation).
- [ ] A real purchase with a small amount, then a refund.
- [ ] Owner publishes the final Terms, Refunds, Shipping and VYRO EULA (the checkout refuses orders until all four are live).
- [ ] Production smoke tests; set `storeEnabled = true`.

Input still missing: a signed VYRO build that uses the licensing API. v1.4.0 (2026-10-18) has a valid update signature but no code signing (SmartScreen warns) and no licensing yet (spec §12.6).

## Milestone D — Growth (Phase 11+; order agreed after Launch 2)

- [ ] Admin: custom dashboard; support tickets; Translator role + Translations view + "Draft Hindi with AI"; TOTP 2FA.
- [ ] Look and feel: WebGL home hero; GSAP sequences if needed.
- [ ] Store: Google sign-in; subscriptions (if chosen); international payments (if enabled); volume licenses and quantity > 1. (Update-feed eligibility via Bearer token is dropped: VYRO updates from GitHub, docs/decisions.md "VYRO updates".)
- [ ] Baby: shared commerce API + cross-domain sign-in for Baby's website.
- [ ] Growth: AI assistant, MenuMesh live demo, VYRO browser teaser, creator / affiliate program, verified-buyer reviews, comparison pages, site search, public roadmap, case studies, press kit, partner program, Startup India / Udyam badges.

## Anytime — Brand swap

- [ ] Follow spec Appendix B when the logo arrives.
