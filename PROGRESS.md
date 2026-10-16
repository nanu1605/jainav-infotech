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

- [ ] Home hero gradient mesh; MenuMesh, VYRO and Baby hero animations; feature scroller; product card effects; micro-interactions.
- [ ] Performance tuning.

### Phase 6 — Deploy and launch the company website

- [ ] Provision the VPS; Docker images; `compose.prod.yml` (app, postgres, umami, caddy, backup).
- [ ] Cloudflare: DNS, SSL Full (strict), Origin CA certificate, origin firewall, WAF skip rule, Bot Fight Mode off, Access on `/admin*` and `/api/users/*`; R2 buckets + custom domains.
- [ ] Staging and production; per-environment image builds; deploy workflows; `prodMigrations`.
- [ ] Sentry, Umami, external uptime monitor + status page; Telegram alerts.
- [ ] Backups + restore runbook (run a real restore test).
- [ ] Security headers / CSP (§16).
- [ ] SPF / DKIM / DMARC.
- [ ] Final content check; Owner publishes the legal pages (§8.13).

## Milestone C — VYRO store live (Launch 2)

### Phase 7 — Accounts, checkout and invoices (Razorpay test mode)

- [ ] First: write `docs/licensing-api.md` (§12.4) so VYRO app work can start in parallel.
- [ ] `customers`, `otpChallenges`, `customerSessions`; OTP sign-in and sessions (§11.2); account shell (overview, orders & invoices, settings); add `customer` to `dataRequests`.
- [ ] `orders`, `invoices`, `invoiceCounters`, `webhookEvents`, `coupons`; `commerceSettings`.
- [ ] Checkout flow (§11.3) incl. acceptance checkbox, verify, webhook, fulfilment transaction, post-commit jobs, paid-twice flagging, reconciliation job, success / failure pages.
- [ ] Tax engine, invoice numbering and PDF (§11.4); emails for this phase (§11.7).
- [ ] Refund and dispute events recorded (effects in Phase 9).

### Phase 8 — Licensing

- [ ] `licenses`, `activations`, `trials`.
- [ ] Key generation, normalization and storage; licensing API (§12.4); JWT signing + JWKS; grace re-issue.
- [ ] Fulfilment creates real licenses; the license key goes into the order email; new-device email.
- [ ] Account: Licenses page with device deactivation; Downloads page.
- [ ] Complimentary license issuing (admin endpoint); `license-test-client`.

### Phase 9 — Store operations

- [ ] Refunds (Owner endpoint) and the `refund.processed` path: credit notes, license revocation, emails; `refund.failed` alerts.
- [ ] Disputes: order `disputed`, license suspended, alert.
- [ ] Resend license email; re-render invoice PDF; one-click refund for paid-twice orders.
- [ ] Monthly CA report (invoices + credit notes + SAC summary); leads report.
- [ ] "Email this waitlist" (consented leads only).
- [ ] Simple insights: `dailyStats` views + Umami link.

### Phase 10 — Store go-live

- [ ] Switch to Razorpay live keys (after activation).
- [ ] A real purchase with a small amount, then a refund.
- [ ] Owner publishes the final Terms, Refunds and VYRO EULA.
- [ ] Production smoke tests; set `storeEnabled = true`.

## Milestone D — Growth (Phase 11+; order agreed after Launch 2)

- [ ] Admin: custom dashboard; support tickets; Translator role + Translations view + "Draft Hindi with AI"; TOTP 2FA.
- [ ] Look and feel: WebGL home hero; GSAP sequences if needed.
- [ ] Store: Google sign-in; subscriptions (if chosen); international payments (if enabled); volume licenses and quantity > 1; update-feed eligibility via Bearer token.
- [ ] Baby: shared commerce API + cross-domain sign-in for Baby's website.
- [ ] Growth: AI assistant, MenuMesh live demo, VYRO browser teaser, creator / affiliate program, verified-buyer reviews, comparison pages, site search, public roadmap, case studies, press kit, partner program, Startup India / Udyam badges.

## Anytime — Brand swap

- [ ] Follow spec Appendix B when the logo arrives.
