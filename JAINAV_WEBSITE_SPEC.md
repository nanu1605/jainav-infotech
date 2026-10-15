# Jainav Infotech — Company Website Build Spec

**Version:** 1.1 · 15 October 2026 (reviewed)
**Owner:** Tanishq, Jainav Infotech Private Limited
**Builder:** Claude Code, phase by phase

---

## 0. How to use this spec

**For Tanishq:** put this file in an empty folder, open Claude Code in that folder and say:
*"Read JAINAV_WEBSITE_SPEC.md and start Phase 0."* Claude Code stops after every phase so you can review it before the next one starts.

**For Claude Code:**
1. Build strictly phase by phase (§20). When a phase is finished, run every check, write a short phase report (what was built, how to verify it, open questions, placeholders still in use), then stop and wait for approval.
2. In Phase 0, create `CLAUDE.md` from §3, `PROGRESS.md` (every task in §20 as a checklist) and `docs/decisions.md`. Keep `PROGRESS.md` up to date.
3. `{{LIKE_THIS}}` marks a value only Tanishq can provide (§21). Never invent real company details, prices, tax settings or keys. Keep the placeholder, make the feature work with it, and list it in the phase report.
4. Where §22 gives a default for an open decision, use it and record it in `docs/decisions.md`.
5. If a library's API is uncertain, read the docs for the installed version instead of guessing. If this spec conflicts with how a library actually works, follow the library, record the deviation in `docs/decisions.md`, and mention it in the phase report.
6. Ask before: adding a dependency that isn't in §2's pre-approved list, changing the licensing API contract (§12.4), or anything involving real money or live keys.

---

## 1. Project overview

### 1.1 Company
Jainav Infotech Private Limited, Indore, Madhya Pradesh, India. It builds and sells its own software products and also offers custom software services.

### 1.2 Goals
1. Present Jainav as a credible product company and showcase every product.
2. Sell VYRO directly: checkout, licensing, downloads and in-app updates.
3. Capture leads: service enquiries, demo requests, waitlists, newsletter.
4. Work fully in English and Hindi.
5. Let Tanishq manage products and all content from an admin panel, without code.

### 1.3 Audiences
- Restaurant owners (MenuMesh): mostly on mobile; many prefer Hindi.
- PC users, gamers and enthusiasts (VYRO).
- Privacy-conscious Windows users (Baby).
- Businesses that need custom software (services).
- Job seekers, partners, press.

### 1.4 Products and where they are sold
| Product | What it is | Sold on | Mode on this site |
|---|---|---|---|
| MenuMesh | Multi-restaurant QR table-ordering SaaS | Its own website | `external`: showcase page → "Visit MenuMesh ↗" |
| Baby | Privacy-first voice assistant for Windows | Its own website (not built yet) | `external`: showcase page + waitlist until its site is live |
| VYRO | Windows hardware monitor — "Know your machine." | **This website** | `hosted`: product mini-site with store, licensing, downloads, updates |

New products are added from the admin in either mode.

### 1.5 Positioning
- **Products first.** The homepage leads with products. Services have their own section, with the products as proof ("we built these — we can build yours").
- **Endorsed brands.** Each product keeps its own name and look and carries a "by Jainav" tag. Product websites link back to this site.

---

## 2. Stack and key decisions

| Area | Decision | Notes |
|---|---|---|
| Runtime | Node.js 24 LTS | |
| Framework | Next.js 16.2.x (≥ 16.2.6) App Router, React 19, TypeScript strict | Use `proxy.ts`, not `middleware.ts`. `pnpm lint` runs `eslint .` (Next 16 removed `next lint`). Leave `cacheComponents` off unless the installed Payload's docs say it's supported |
| CMS / admin | Payload CMS, latest stable **3.x** (3.90+), inside the same Next.js app | Payload 4 entered beta on 13 Oct 2026 — don't use it; upgrade once it is stable |
| Database | PostgreSQL 16+ via `@payloadcms/db-postgres`; migrations run on container start via `prodMigrations` | |
| API surface | Payload REST for the admin only; GraphQL disabled; custom route handlers under `/api/v1` | |
| Styling | Tailwind CSS v4 + generated design tokens (§5) | Brand swap = edit one config file |
| UI primitives | shadcn/ui (Radix), its theme variables mapped onto our tokens | |
| Color tooling | `culori` (scale generation, sRGB gamut mapping, contrast) | |
| Theme switching | `next-themes` with `attribute="data-theme"` | |
| i18n | `next-intl` (routing + UI strings) + Payload field-level localization (content) | |
| Animation | Motion (motion.dev) for everything at launch | GSAP only if a sequence can't be done with Motion (record why). WebGL hero is a Phase 11 upgrade |
| Forms | React Hook Form + Zod | |
| Email | Resend + React Email via `@payloadcms/email-resend` | |
| Payments | Razorpay: Orders, Standard Checkout, Payments fetch, Refunds, Webhooks; automatic capture | |
| Invoice PDFs | `@react-pdf/renderer` | English, Latin script |
| License tokens | Ed25519 JWTs via `jose`, `alg` pinned to `EdDSA` | VYRO verifies them offline |
| File storage | Cloudflare R2 via `@payloadcms/storage-s3`: a public bucket (media, installers) and a private bucket (CVs, invoice PDFs, attachments); local disk in development | No egress fees on downloads |
| Anti-spam | Cloudflare Turnstile + honeypot field | |
| Rate limiting | `rate-limiter-flexible` with Postgres store, keyed on `CF-Connecting-IP` | No extra Redis service |
| Payload plugins | `@payloadcms/plugin-seo`, `@payloadcms/plugin-redirects`; `@payloadcms/plugin-search` in Phase 11 | |
| Background work | Payload Jobs Queue with `autoRun` and scheduled tasks | |
| Analytics | Umami, self-hosted, cookie-free + server-side counters | No cookie banner needed |
| Errors | Sentry (PII scrubbing on) | |
| Uptime / status page | External monitor with a public status page (UptimeRobot or Better Stack free tier) | Must run outside the VPS |
| Admin protection | Cloudflare Access (free Zero Trust plan) on `/admin*` and `/api/users/*` + Payload login lockout | TOTP 2FA in Phase 11 |
| Tests | Vitest, Playwright + `@axe-core/playwright`, Lighthouse CI | |
| Hosting | Docker on a VPS behind Cloudflare; Caddy with a Cloudflare Origin CA certificate; GitHub Actions CI/CD (§18) | Alternative: Vercel Pro + managed Postgres |
| Package manager | pnpm | |

**Pre-approved packages** (no need to ask): `next-intl`, `next-themes`, `motion`, `zod`, `react-hook-form`, `@hookform/resolvers`, `jose`, `culori`, `semver`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sharp`, `@payloadcms/live-preview-react`, `@payloadcms/plugin-seo`, `@payloadcms/plugin-redirects`, `@payloadcms/storage-s3`, `@payloadcms/email-resend`, `@react-email/components`, `@react-pdf/renderer`, `razorpay`, `rate-limiter-flexible`, `exceljs`, `@sentry/nextjs`, a maintained Turnstile React wrapper (e.g. `@marsidev/react-turnstile`), the Radix packages shadcn components pull in, `vitest`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`.

---

## 3. Working rules → copy into `CLAUDE.md` in Phase 0

**Process**
- Work one phase at a time (§20). At the end of a phase: run all checks, write the phase report, update `PROGRESS.md`, stop.
- Small commits with Conventional Commit messages.
- Record every non-obvious choice in `docs/decisions.md`.
- The full spec is `JAINAV_WEBSITE_SPEC.md`; re-read the relevant sections at the start of each phase.

**Code**
- TypeScript strict. No `any` without a comment explaining why.
- Validate every external input with Zod: form data, API bodies, query params, webhooks.
- Secrets live only in environment variables and server code (`import 'server-only'`).
- Payload Local API: always pass `overrideAccess` and `depth` explicitly (Payload 4 changes both defaults).
  - Public content: `overrideAccess: false`; access rules return only published documents to anonymous requests.
  - Customer data: `overrideAccess: true` **plus** an explicit `where` on the signed-in customer's id.
- Customer data (customers, OTP challenges, sessions, orders, invoices, licenses, activations, trials, leads, data requests, webhook events, private files) is never readable through Payload's REST API except by admin roles. GraphQL is disabled.
- Money is stored as integers in the smallest unit (paise / cents). Never floats.
- Business dates (invoice dates, financial years, report months, expiry dates shown to people) always use the `Asia/Kolkata` time zone explicitly.
- Payload hooks that revalidate pages skip when `req.context.disableRevalidate` is set; seed scripts and jobs set it.
- Stay inside §2's stack and pre-approved packages; ask before adding anything else.

**Design system**
- Colors are defined only in `src/styles/brand.config.ts`. `pnpm tokens:build` generates `tokens.css` and `tokens.generated.ts` — never edit those by hand.
- No color literals anywhere else, no Tailwind default palette classes (`bg-red-500`, `bg-black`, `text-white`…) and no arbitrary color values (`bg-[#123456]`). `pnpm check:tokens` enforces this.
- Fonts, radii, shadows and motion timings also come from tokens.
- Icons use `currentColor`.
- Every component must work in light and dark themes and in English and Hindi.

**Language**
- No hard-coded user-facing text in components. UI strings live in `messages/en.json` and `messages/hi.json`; content comes from Payload localized fields. `pnpm check:i18n` fails if `hi.json` is missing a key that `en.json` has.
- Never split Hindi text into characters for animation (it breaks matras and conjuncts). Split by word with `Intl.Segmenter`.

**Quality**
- Semantic HTML, visible focus, full keyboard support, alt text, WCAG 2.1 AA contrast.
- Every animation respects `prefers-reduced-motion`.
- Meet the budgets in §15. Lazy-load heavy code (video, maps, schedulers, large animations).

**Security**
- Verify Razorpay signatures **and** re-fetch the payment from Razorpay before fulfilling; fulfilment is idempotent.
- Rate-limit sign-in, forms, checkout and licensing endpoints, keyed on `CF-Connecting-IP`.
- Never log secrets, OTPs, license keys or unnecessary personal data.

**Checks** (all must pass before a phase is done): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:tokens`, `pnpm check:i18n`, `pnpm build`, plus the phase's e2e tests.

---

## 4. Architecture

### 4.1 Overview
One Next.js application contains the public site, the Payload admin (`/admin`) and its API, and custom route handlers.

```
Visitors ─► Cloudflare (DNS, CDN, WAF, Turnstile, Access) ─► Caddy ─► Next.js + Payload (Docker)
                                                                    ├─ PostgreSQL
                                                                    ├─ Cloudflare R2 (public + private buckets, backups)
                                                                    ├─ Razorpay (checkout, payment fetch; webhooks in)
                                                                    ├─ Resend (email)
                                                                    ├─ Telegram Bot API (alerts)
                                                                    └─ Umami · Sentry
External uptime monitor ─► public pages + /api/v1/licensing/health + update feed
VYRO app ───────────────► /api/v1/licensing/*  ·  /api/v1/updates/vyro/*
Baby website (Phase 11) ─► shared commerce API (design in Phase 11)
```

### 4.2 Repository layout (target)
```
/
├─ CLAUDE.md · PROGRESS.md · JAINAV_WEBSITE_SPEC.md
├─ docs/            decisions.md, licensing-api.md, privacy-data-map.md, runbooks/
├─ messages/        en.json, hi.json
├─ src/
│  ├─ app/
│  │  ├─ (frontend)/[locale]/…        public pages, account, checkout
│  │  ├─ (frontend)/go/[slug]/        tracked redirects (not localized)
│  │  ├─ (frontend)/feeds/en.xml, feeds/hi.xml   RSS route handlers (not localized)
│  │  ├─ (payload)/admin, (payload)/api          Payload (generated)
│  │  └─ api/v1/…                     custom route handlers
│  ├─ collections/ globals/ blocks/ fields/ hooks/ access/ endpoints/ jobs/
│  ├─ components/   ui/ motion/ layout/ sections/ product/ forms/ account/
│  ├─ lib/          commerce/ tax/ invoices/ licensing/ email/ i18n/ seo/ analytics/ ratelimit/ telegram/
│  ├─ emails/       React Email templates (en + hi)
│  ├─ styles/       brand.config.ts (edit) · fonts.ts · globals.css · tokens.css + tokens.generated.ts (generated)
│  ├─ i18n/         routing.ts, request.ts, navigation.ts
│  ├─ proxy.ts
│  └─ payload.config.ts
├─ scripts/         seed, tokens-build, check-tokens, check-i18n, gen-licensing-keys, license-test-client
├─ tests/           unit/, integration/, e2e/
├─ docker/          Dockerfile, compose.dev.yml, compose.prod.yml, Caddyfile
└─ .github/workflows/
```
Custom APIs under `/api/v1/…` take priority over Payload's `/api/[...slug]` catch-all (static segments win in Next.js routing). Admin-only actions (refund, resend, re-render, complimentary license, email waitlist) are Payload collection endpoints instead, so they inherit admin authentication.

### 4.3 Rendering, caching and builds
- Public pages are statically rendered and revalidated on demand from Payload `afterChange` / `afterDelete` hooks, for **both** locales.
  - English URLs are rewritten internally to `/en/…`, so revalidate the internal paths (`/en/…` and `/hi/…`) or route patterns, e.g. `revalidatePath('/[locale]/products/[slug]', 'page')`.
  - Shared data (navigation, settings, product lists) uses cache tags. On Next 16, expire them immediately with `revalidateTag(tag, { expire: 0 })` (check the installed version's signature).
  - Hooks skip revalidation when `req.context.disableRevalidate` is set.
- Docker images are built in CI **without a database**: when `SKIP_DB_AT_BUILD=1`, every `generateStaticParams` (including the `[locale]` layout's) returns `[]`, so pages render on first request and are then cached. Payload's documented "build without a DB connection" approach is the alternative.
- Drafts: Payload Live Preview + Next.js draft mode.
- Account, checkout and `/api/v1/*`: dynamic, never cached.

### 4.4 Locale routing
- `next-intl` routing: locales `en`, `hi`; default `en`; `localePrefix: 'as-needed'` (English has no prefix, Hindi lives under `/hi`); `localeDetection: false`; `localeCookie: false` (the site never redirects based on a cookie or browser language).
- The `proxy.ts` matcher excludes `/admin`, `/api`, `/go`, `/feeds`, `/_next` and any path with a file extension.

### 4.5 Shared commerce (later)
Customers, plans, orders, invoices and licenses are product-agnostic and keyed by product slug. VYRO is the first user. Letting Baby's website use the same accounts, checkout and licensing (an API plus cross-domain sign-in) is designed in Phase 11.

---

## 5. Design system and theming

### 5.1 Principles
Modern, premium and minimal: generous whitespace, strong type, one standout animation per page. Light and dark themes (default follows the system; the visitor's choice is remembered). Each product page uses its own accent color inside the Jainav system.

### 5.2 Tokens
**Source:** `src/styles/brand.config.ts` is the only file that contains colors:
- seed colors — `brand`, `brandAccent`, neutral tint, status hues;
- the semantic mapping for light and dark (which scale step each semantic token uses).

**Generation:** `pnpm tokens:build` (with `culori`) writes:
- `src/styles/tokens.css` — primitive scales (`--brand-50…950`, `--brand-accent-50…950`, `--neutral-0…1000`, status), gamut-mapped to sRGB, plus semantic tokens for `:root` (light) and `[data-theme="dark"]`;
- `src/styles/tokens.generated.ts` — the semantic values as hex for emails, share images, invoice PDFs and admin branding.

It also checks contrast and fails if any pair misses its target: body text ≥ 4.5:1 on `--bg` and `--surface`; `--primary-fg` on `--primary` ≥ 4.5:1; large text and UI elements (input borders, focus ring, icons) ≥ 3:1 — in both themes.

**Semantic tokens:**
- Surfaces: `--bg`, `--bg-subtle`, `--surface`, `--surface-raised`, `--overlay`, `--hover`
- Text: `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-inverse`
- Lines: `--border`, `--border-strong`, `--ring`
- Actions: `--primary`, `--primary-hover`, `--primary-fg`, `--brand-accent`, `--brand-accent-fg`
- Status: `--success`, `--warning`, `--danger`, `--info` (each with `-fg`)
- Effects: `--glow`, `--gradient-1…3`, `--shadow-sm/md/lg`
- Shape: `--radius-sm/md/lg/xl` · Motion: `--ease-out`, `--ease-in-out`, `--duration-fast/base/slow`

**Tailwind and shadcn (`globals.css`):**
- `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` with `next-themes` set to `attribute="data-theme"`.
- `@theme inline` maps the tokens to utilities and resets Tailwind's default palette, so only token colors exist.
- shadcn's variables map onto ours: background → `bg`, foreground → `fg`, card → `surface`, popover → `surface-raised`, primary → `primary`, secondary and muted → `bg-subtle`, muted-foreground → `fg-muted`, accent (shadcn's hover/selected background) → `hover`, destructive → `danger`, border and input → `border`, ring → `ring`.
- The brand's own accent color is `brand-accent` — never shadcn's `accent`.
- Font sizes use Tailwind's `--text-*` namespace; color tokens never do.

**Placeholder seeds until the logo arrives:** brand ≈ `oklch(0.55 0.22 275)` (electric indigo), brandAccent ≈ `oklch(0.78 0.14 195)` (cyan), cool neutrals.

**`pnpm check:tokens`** fails on color literals (`#hex`, `rgb(`, `hsl(`, `oklch(`) outside `brand.config.ts` and the generated files, on Tailwind default palette classes, and on arbitrary color values.

### 5.3 Product accent colors
- Each product has `accentColor` (validated hex). Product pages set `--product-accent` as an inline style and derive tints with `color-mix(in oklch, …)`.
- Text on accent-colored surfaces is chosen automatically (light or dark) to meet contrast. If the accent fails 3:1 against the page background, it is used only decoratively.

### 5.4 Typography (placeholders until the brand kit)
- `src/styles/fonts.ts`: Plus Jakarta Sans (Latin, display and body) and Mukta (Devanagari subset) via `next/font`; their CSS variable classes go on `<html>`.
- Font stacks put the Latin font first and the Devanagari font second, so mixed text uses each script's font.
- `:lang(hi)` gets extra line height for matras, no letter-spacing and no all-caps transforms.

### 5.5 Logo placeholder
`<Logo />` renders a typographic "Jainav" wordmark and a "J" monogram until the real files land in `public/brand/`.

### 5.6 Components (Phase 2)
- **Layout:** Container, Section, Grid, Stack
- **Navigation:** Header (mega-menu + mobile menu), Footer, LanguageSwitch, ThemeToggle, AnnouncementBar, Breadcrumbs, ProductSubNav
- **Actions:** Button (primary, secondary, ghost, link; sizes), IconButton, MagneticButton
- **Content:** Card, ProductCard, Badge (status, platform), Tag, Stat, Accordion, Tabs, Steps, Quote, Avatar, Marquee, Table, Callout, EmptyState
- **Forms:** Input, Textarea, Select, Checkbox, Radio, Switch, OTPInput, FormField, MultiStepForm, TurnstileWidget
- **Feedback:** Toast, Dialog, Drawer, Tooltip, Skeleton, Spinner
- **Media:** ResponsiveImage, VideoLoop (muted, plays only in view), Gallery + lightbox
- **Motion primitives:** Reveal, Stagger, TextReveal (word-based), CountUp, Parallax, Tilt, Spotlight. Page transitions only if View Transitions are stable in the installed Next.js; otherwise skip.
- `/styleguide` (development and staging only) shows every component in light/dark × English/Hindi.

### 5.7 Brand swap
When the logo arrives, follow Appendix B: replace the logo files, edit `brand.config.ts` (and `fonts.ts` if brand fonts are given), run `pnpm tokens:build`.

---

## 6. Hindi and internationalization
- **Locales:** `en` (default) and `hi`. English URLs have no prefix; Hindi URLs start with `/hi`. Slugs are the same in both languages.
- **Switcher:** "EN | हिंदी" in the header and footer. Switching keeps the visitor on the same page and saves the choice in `localStorage['jv-lang-pref']`.
- **Suggestion banner:** a client component shows a small dismissible "हिंदी में देखें?" banner when no preference is stored, the page is in English and `navigator.languages` includes Hindi. Dismissing it stores the preference. It never redirects, so pages stay static.
- **UI strings:** `messages/en.json` and `messages/hi.json` (ICU plurals). CI checks for missing keys.
- **Content:** Payload localization with locales `en` ("English") and `hi` ("हिंदी"), default `en`, fallback on. Mark every human-readable field `localized: true` (titles, text, rich text, labels, alt text, SEO fields). Do **not** localize whole blocks or arrays — the layout is shared; localize the text fields inside them.
- **Translation status:** every collection whose documents have their own URL (products, services, pages, posts, docs, jobs, legalPages) has a sidebar field `hiStatus`: `missing | draft | ready`. Other content (plans, releases, changelog, FAQs, testimonials, team) falls back to English silently.
  - `ready`: the Hindi page is indexable, in the sitemap, and paired with the English page through hreflang.
  - `missing` / `draft`: the Hindi page renders (English fallback where needed) but is `noindex` with a self-referencing canonical, and is left out of the sitemap and hreflang.
- **Empty checks:** anything that asks "is this Hindi field empty?" must query with `fallbackLocale: false`; with fallback on, every field looks filled.
- **SEO:** `<html lang>` per locale; hreflang `en`, `hi` and `x-default` (English) for `ready` pairs.
- **Formats:** `Intl` with `en-IN` / `hi-IN`; Latin digits in both; rupees with Indian grouping (₹1,00,000).
- **Emails:** sent in the recipient's saved language; every template exists in both languages.
- **Legal pages:** the Hindi versions state, in Hindi, that the English version prevails if the two differ.
- **Share images:** Satori (`next/og`) can't shape Devanagari, so Hindi pages use the English share image.
- **Drafts:** Payload drafts cover the whole document (per-locale publishing is experimental — leave it off). Editors review Hindi changes before publishing.
- **Later (Phase 11):** a Translator role limited to Hindi (Payload `filterAvailableLocales`), a Translations view and "Draft Hindi with AI".

---

## 7. Routes
Hindi routes are `/hi` + the same path.

| Route | Page | Phase |
|---|---|---|
| `/` | Home | 3 |
| `/products` | All products | 3 |
| `/products/[slug]` | Product page (showcase, or hosted overview) | 3 |
| `/products/[slug]/pricing` | Hosted: pricing (display in 3, checkout in 7) | 3 / 7 |
| `/products/[slug]/download` | Hosted: downloads | 3 |
| `/products/[slug]/changelog` | Hosted: release notes | 3 |
| `/products/[slug]/docs/[[...path]]` | Hosted: docs | 3 |
| `/products/[slug]/support` | Hosted: FAQ + contact form | 3 |
| `/vyro` (vanity) | 308 → `/products/vyro` | 3 |
| `/services`, `/services/[slug]` | Services | 3 |
| `/about` | About | 3 |
| `/contact` | Contact | 3 (form wired in 4) |
| `/careers`, `/careers/[slug]` | Careers | 3 (application form wired in 4) |
| `/blog`, `/blog/[slug]` | Blog | 3 |
| `/changelog` | Company-wide changelog | 3 |
| `/legal/[slug]` | Privacy, terms, refunds, shipping, EULA… | 3 |
| `/account/…` | Sign-in, overview, orders & invoices, settings (7); licenses, downloads (8) | 7–8 |
| `/checkout/[product]/[plan]`, `/checkout/success`, `/checkout/failed` | Checkout | 7 |
| `/go/[slug]` | Tracked outbound redirect (not localized) | 3 |
| `/feeds/en.xml`, `/feeds/hi.xml` | RSS | 3 |
| `/styleguide` | Component gallery (not in production) | 2 |
| `/admin` | Payload admin | 0 |
| `/api/v1/downloads/*`, `/api/v1/updates/*` | Download counting, update feed | 3 |
| `/api/v1/forms/*` | Forms, newsletter confirm, unsubscribe | 4 |
| `/api/v1/checkout/*`, `/api/v1/webhooks/razorpay` | Store | 7 |
| `/api/v1/licensing/*` | Licensing | 8 |
| `/sitemap.xml`, `/robots.txt` | SEO | 3 |

Custom 404, 500 and maintenance pages in both languages.

---

## 8. Page specifications

### 8.1 Global layout
- **Header:** logo; Products (mega-menu with product cards from the CMS), Services, About, Blog, Contact; language switch; theme toggle; Account (only when `storeEnabled`); primary button "Start a project". Sticky, compacts on scroll; full-screen menu on mobile.
- **Footer:** link columns from the CMS (products, company, legal), newsletter sign-up, social links, and the legal block from `siteSettings`:
  *Jainav Infotech Private Limited · CIN {{CIN}} · Registered office: {{REGISTERED_ADDRESS}} · {{EMAIL}} · {{PHONE}}*
- **Announcement bar:** text + link from settings; dismissible; localized.
- **WhatsApp button** (Phase 4): `wa.me/{{WHATSAPP_NUMBER}}` with a localized, page-specific pre-filled message.

### 8.2 Home (Pages document `home`, built from blocks)
1. **Hero:** headline, subheadline, two buttons ("Explore products", "Build with us"), routing chips, animated gradient background (§14).
2. **Product showcase:** featured products in admin order.
3. **Services overview:** the four pillars.
4. **Why Jainav:** three or four principles.
5. **Proof:** stats + testimonials. Each stat is `{value, label (L), source: manual | downloads}` (`downloads` reads the real download total). The block hides itself when empty; only real numbers and consented testimonials.
6. **Process:** Discover → Design → Build → Support.
7. **Latest:** two newest posts + three changelog items.
8. **Closing call to action + newsletter.**

Routing chips (editable): "My restaurant" → MenuMesh · "My PC" → VYRO · "A private assistant" → Baby · "Custom software" → Services.

### 8.3 Products hub
Grid of product cards (logo, name, tagline, status badge, platform badges, accent glow). Category/platform filters appear once there are more than six products. Coming-soon products show a waitlist button.

### 8.4 Product pages
- **`external` mode:** a single page built from product blocks; buttons per §8.5.
- **`hosted` mode:** an overview page plus sub-pages (pricing, download, changelog, docs, support) with a sticky product sub-nav.
- **Product blocks** (all optional; an empty block renders nothing):
  ProductHero · ProblemSolution · FeatureScroller (media changes as feature text scrolls) · FeatureGrid · ScreenshotGallery · VideoEmbed · HowItWorks · Audience/UseCases · PricingTable (hosted: from `plans`; external: manual tiers + "See full pricing" link) · PrivacyPanel ("Stays on your device" / "Goes to the cloud") · SystemRequirements · DownloadPanel (latest release, version, size, SHA-256) · ChangelogPreview · FAQ · Testimonials · ComparisonTable · CTABand · RichText · StatStrip (same stat shape as §8.2) · Embed (allow-listed domains only)

### 8.5 Product buttons (unit-tested)
Each product has a primary button and an optional secondary button (e.g. VYRO: "Download free" + "Buy Pro").

**Button fields:** `{type, labelOverride (L), plan, channel, url}`
- `plan`: relationship to one of this product's plans; required for `buy`.
- `channel`: `stable | beta`, default `stable`; used by `download`.
- `url`: only for `demo`; overrides `siteSettings.schedulerUrl`.

**Validation:** `visit` requires the product's `externalUrl`; `buy` is allowed only for `hosted` products; the plan must belong to the product.

**Resolution order:**
1. `status = coming-soon` → **Join the waitlist** (waitlist form for that product). Overrides everything else.
2. `visit` → **Visit {name} ↗** to `externalUrl` via `/go/{slug}`; opens in a new tab with `rel="noopener"`.
3. `download` → **Download for Windows** + version and size → `/api/v1/downloads/{slug}/latest?channel=…`. Only when a published release exists on that channel; otherwise **Join the waitlist**.
4. `buy` → **Buy {plan}** → pricing page. Disabled with "Available soon" while `storeEnabled` is false.
5. `demo` → **Book a demo** → `url` or the scheduler link.
6. `contact` → **Talk to us** → contact form with the product preselected.

Secondary links (docs, Microsoft Store / Play / App Store badges, GitHub, status page) appear in a row under the hero.

### 8.6 Tracked redirects and vanity paths
- `shortLinks` collection: slug, destination, UTM defaults (`utm_source=jainav`, `utm_medium=site`, `utm_campaign={slug}`), active, notes.
- `/go/[slug]` handler: find the active link → add UTM params if missing → 302. Unknown or inactive slug → 404.
- The click counter runs inside Next.js `after()` so it never delays the redirect: `INSERT … ON CONFLICT (date, kind, key) DO UPDATE SET count = count + 1` through Payload's Drizzle handle (a Local API read-then-write would lose counts).
- Products with a `visit` button keep a short link with the product's slug in sync automatically.
- Internal redirects (old URLs, vanity paths like `/vyro`) are stored with the redirects plugin. The plugin doesn't perform redirects itself: the localized not-found / catch-all handler looks them up and calls `permanentRedirect()` (308).

### 8.7 Services
Hero; the four pillars from the `services` collection (Custom software & SaaS · AI & ML solutions · Cloud & DevOps · E-commerce & web platforms), each with summary, capabilities, typical deliverables and related proof (our own products); process; engagement models (fixed-scope project, monthly retainer, dedicated developer); FAQ; "Start a project" form. Each pillar also has its own page at `/services/[slug]`.

### 8.8 About
Story; mission and values; founder section (photo, bio, links); timeline (incorporation, launches); company facts (legal name, CIN, incorporation date, registered office); "Built in Indore" section; call to action.

### 8.9 Contact
Form with a topic (sales, support, partnership, careers, press, other) that routes to the right inbox; WhatsApp, email, phone; address with a map that loads only on interaction; business hours.

### 8.10 Careers
Job list with filters; job pages with JobPosting structured data; application form with a CV (PDF ≤ 5 MB) stored in `privateFiles`. With no openings: an "Introduce yourself" form. Internship section.

### 8.11 Blog
List with pagination and tags; post page with reading time, author, share buttons and related posts; RSS at `/feeds/en.xml` and `/feeds/hi.xml` (Hindi feed lists only `ready` posts). Hindi is optional per post (`hiStatus`).

### 8.12 Changelog
Company-wide feed that merges `changelog` entries and published releases, grouped by month and filterable by product.

### 8.13 Legal
- Pages: privacy, terms, refunds-cancellation, shipping-delivery (delivery is digital: license key by email and instant download), eula-vyro, cookies (essential cookies only), privacy requests / grievance contact.
- Phase 3 drafts them from neutral templates. `legalPages` use drafts; **publishing is Owner-only and counts as approval**, and production shows only published versions. Each page shows its version and effective date; Payload versions keep the history.
- **Launch 1 needs published privacy, terms, refunds-cancellation and shipping-delivery pages — and eula-vyro if a VYRO download is live.**

### 8.14 Account and checkout
See §11.

### 8.15 System pages
404 (on brand, with links to products), 500, maintenance mode (toggle in settings).

---

## 9. Content model (Payload)
`(L)` = localized field. All collections have timestamps. "Drafts" = Payload drafts + versions.

### 9.1 Collections
| Collection | Key fields | Phase / notes |
|---|---|---|
| `users` (admins) | name, email, roles[] (`owner`, `editor`, `support`) | 0–1; `maxLoginAttempts: 5`, `lockTime` 15 min; Translator role in 11 |
| `media` | file, alt (L), caption (L), focal point | 1; public bucket; responsive sizes |
| `installers` | upload (`.exe` / `.msi`) | 1; public bucket, prefix `downloads/{product}/{version}/` |
| `privateFiles` | upload, purpose (`cv/invoice/attachment`), owner reference | 4; private bucket; served only through short-lived signed URLs |
| `products` | name, slug, logo, icon, tagline (L), summary (L), accentColor, category, type (`saas/desktop/mobile/web/api`), platforms[], status (`live/beta/coming-soon/retired`), hostingMode (`external/hosted`), externalUrl, launchDate, featured, sortOrder, heroMedia, cardPreview (short video), primaryButton, secondaryButton (§8.5), secondaryLinks[], layout (product blocks), seo (L), hiStatus | 1; drafts; live preview |
| `plans` | product, code, name (L), description (L), billing (`one_time/yearly/monthly`), priceINR (paise, GST-inclusive), priceUSD (cents, optional), features[] (L), maxActivations, updatesForMonths (empty = lifetime), highlight, active, sortOrder | 1 (display); checkout uses it in 7 |
| `releases` | product, version (semver), channel (`stable/beta`), platform (default `windows-x86_64`), releasedAt, notes (L, plain text), installer (→ `installers`), updaterSignature (contents of `.sig`), sha256 (auto), sizeBytes (auto), minOs, published | 1; Editors create, **only Owner publishes** |
| `docs` | product, title (L), slug, parent, body (L), sortOrder, hiStatus | 1; drafts |
| `services` | title (L), slug, summary (L), icon, capabilities[] (L), deliverables[] (L), relatedProducts, layout (blocks), seo (L), hiStatus | 1; drafts |
| `pages` | title (L), slug, layout (page blocks), seo (L), hiStatus | 1; drafts; home, about, services index… |
| `posts` | title (L), slug, excerpt (L), cover, body (L), tags, author, publishedAt, seo (L), hiStatus | 1; drafts |
| `changelog` | product, title (L), body (L), type (`new/improved/fixed`), date | 1 |
| `testimonials` | quote (L), name, role (L), company, product, avatar, consentReceived, consentNote | 1; drafts; publishing blocked unless consentReceived |
| `faqs` | question (L), answer (L), product, category, sortOrder | 1 |
| `team` | name, role (L), bio (L), photo, links, sortOrder | 1 |
| `jobs` | title (L), slug, type, location, workMode, description (L), postedAt, hiStatus | 1; drafts |
| `legalPages` | title (L), slug, body (L), version, effectiveDate, hiStatus | 1; drafts; **only Owner publishes** |
| `shortLinks` | slug, destination, utm, active, notes | 1 |
| `leads` | type (`contact/project/waitlist/newsletter/demo/careers/partnership`), product, name, email, phone, company, message, details (JSON), attachments (→ `privateFiles`, field added in Phase 4), locale, source {page, referrer, utm}, consent {textVersion, givenAt, ipHash}, marketingConsent {given, at, textVersion, withdrawnAt}, confirmTokenHash, confirmedAt, unsubscribedAt, status (`new/contacted/qualified/won/lost/spam`), notes, assignedTo | 1 (structure), 4 (forms); created only through `/api/v1/forms` |
| `dataRequests` | email, type (`access/correction/erasure/withdraw-consent/grievance`), details, status, handledBy, handledAt; + customer (Phase 7) | 1 (structure), 4 (form) |
| `auditLog` | actor, action, collection, docId, summary, at | 1; read-only; written by hooks |
| `dailyStats` | date, kind (`go-click/download`), key, count; unique (date, kind, key) | 1 |
| `customers` | email (unique), name, phone, country, state, businessName, gstin, preferredLocale, marketingConsent {given, at, textVersion, withdrawnAt}, status | 7; **plain collection, not Payload auth** |
| `otpChallenges` | emailHash, codeHmac, expiresAt, attempts, ipHash | 7 |
| `customerSessions` | tokenHash, customer, expiresAt, lastSeenAt, userAgent | 7 |
| `orders` | orderNumber, customer, items[{plan, qty (= 1), unitPrice}], currency, subtotal, discount, tax {mode, rate, taxable, cgst, sgst, igst}, total, coupon, billing snapshot, acceptance {termsVersion, eulaVersion, at, ipHash}, razorpayOrderId, razorpayPaymentId (unique), status (`created/paid/refunded/partially-refunded/disputed/expired`), flags[], invoice, creditNotes[], events[] | 7 |
| `invoices` | number (unique), kind (`invoice/credit-note`), order, issuedAt (IST), financialYear, seller snapshot, buyer snapshot, placeOfSupply {state, code}, reverseCharge (false), originalInvoice (credit notes), lines, totals, pdf (→ `privateFiles`) | 7; immutable once issued |
| `invoiceCounters` | series, financialYear, next; unique (series, financialYear) | 7 |
| `webhookEvents` | provider, eventId (unique; from the `x-razorpay-event-id` header), event, payload, receivedAt, processedAt, status, error | 7 |
| `coupons` | code, kind (`percent/fixed`), value, currency, products[], plans[], validFrom, validTo, maxRedemptions, perCustomerLimit, redemptions, active | 7 |
| `licenses` | product, plan, customer, order, keyHash (unique), keyEncrypted, keyLast4, status (`active/suspended/revoked/expired`), maxActivations, issuedAt, updatesUntil, source (`purchase/complimentary/manual`), notes | 8 |
| `activations` | license, deviceIdHash, deviceName, os, appVersion, firstSeenAt, lastSeenAt, active, deactivatedAt | 8 |
| `trials` | product, deviceIdHash, startedAt, expiresAt | 8 |

### 9.2 Globals
- **`siteSettings`** (Phase 1): company {legalName, cin, gstin, incorporationDate, registeredAddress, phone, emails {hello, sales, support, careers, privacy}, whatsapp}, socials[], announcement {text (L), link, active}, storeEnabled (false), maintenanceMode, schedulerUrl, defaultSeo (L).
- **`navigation`** (Phase 1): header items (L), footer columns (L).
- **`commerceSettings`** (Phase 7): gstEnabled, gstRatePercent (18), sacCode {{SAC_CODE}}, homeState "Madhya Pradesh" with stateCode "23", invoicePrefix "JI" and creditNotePrefix "JC" (max 4 characters each), pricesIncludeGst (true), exportTreatment {{CONFIRM_WITH_CA}}, internationalEnabled (false), refundWindowDays, defaultMaxActivations (2), deactivationsPerMonth (3), licenseTokenDays (30), refreshAfterDays (7), tokenGraceDays (180), trialDays (14), currentTermsVersion, currentEulaVersion.

### 9.3 Access
| Role | Can do |
|---|---|
| Owner | Everything: settings, users, refunds, publishing releases and legal pages |
| Editor | Create, edit and publish content (products, plans, docs, services, pages, posts, media, faqs, testimonials, team, jobs, changelog, shortLinks); create and edit releases and legal drafts but not publish them; read leads |
| Support | Leads, data requests, customers (read, limited edit), licenses (extend, suspend, deactivate devices), orders (read) |
| Public / customers | Public pages read published content through the Local API with `overrideAccess: false`. Customers see their own data only through our account pages and `/api/v1` handlers (`overrideAccess: true` + `where` on the session's customer id). No customer-data collection is readable through the Payload API except by admin roles; leads can't be created through the Payload API; GraphQL is disabled |

Admin actions (refund, resend license email, re-render invoice, issue complimentary license, email a waitlist) are Payload collection endpoints restricted by role.

---

## 10. Admin panel
- **Branding:** Jainav logo and icon (placeholder until the brand kit).
- **Navigation groups:** Content · Products · Store · Leads · Settings · System.
- **Products:** tabs Basics · Media · Page · Buttons & Links · Pricing (hosted) · SEO · Translation; live preview in both languages (from Phase 3); duplicate; reorder; "feature on homepage"; `hiStatus` as a list column and filter.
- **Releases:** Editor uploads the installer and pastes the `.sig` contents → SHA-256 and size are computed → Owner publishes (this pushes an update to every installed copy) → download page, changelog and update feed update. Unpublishing removes a bad release from the feed.
- **Orders** (Phase 9): Owner refund (full or partial, with a reason), resend the license email, re-render an invoice PDF (same number). Orders flagged as "paid twice" show a one-click refund for the duplicate payment.
- **Licenses** (Phases 8–9): issue a complimentary license (press, creators), extend updates, suspend or revoke, deactivate a device, view activation history.
- **Leads:** filters (type, status, product, date), bulk status change, CSV export, reply links (email / WhatsApp). "Email this waitlist" (Phase 9) sends only to leads with marketing consent that hasn't been withdrawn or unsubscribed.
- **Reports** (Phase 9): monthly CA report (CSV/XLSX) listing invoices **and credit notes** (number, date, buyer, state + code, GSTIN, taxable value, CGST, SGST, IGST, total) plus a SAC-wise summary; leads report.
- **Insights** (Phase 9, simple): `dailyStats` list views and a link to Umami. A custom dashboard comes in Phase 11.
- **Audit log:** read-only.

---

## 11. Commerce (VYRO first, product-agnostic)

### 11.1 Pricing page
- Plans come from `plans`; a free plan (price 0) shows "Download free".
- Currency: INR. While `internationalEnabled` is false, the country is fixed to India and USD is never shown.
- "incl. GST" appears only when `gstEnabled` is true.
- Free vs Pro comparison table; FAQ (license, devices, refunds, updates).

### 11.2 Customer accounts
- **Sign-in (email OTP):** a 6-digit code stored as HMAC-SHA256 with `OTP_PEPPER` in `otpChallenges`; 10-minute expiry; at most 5 attempts; 60-second resend cooldown; Turnstile on the request; rate-limited per email and per IP.
- **Session:** a random 256-bit token in an HTTP-only, Secure, SameSite=Lax cookie; only its SHA-256 is stored in `customerSessions`; 30 days, rolling; signing out deletes the row.
- **Pages:** Overview · Orders & invoices · Settings (name, language, billing details / GSTIN, marketing consent, delete account) in Phase 7; Licenses (reveal/copy key, plan, status, updates-until, devices with "Deactivate") · Downloads in Phase 8. "Support" links to the contact form until tickets arrive (Phase 11).
- **Delete account:** anonymize the profile, revoke sessions, keep orders and invoices for the legally required period (confirm the period with the CA).
- Google sign-in comes later (Phase 11).

### 11.3 Checkout flow (one-time purchase)
1. Pricing → "Buy Pro" → sign in if needed → `/checkout/vyro/pro`.
2. **Checkout page:** plan (quantity fixed at 1), coupon, billing details (name, email, phone, state; optional business name + GSTIN), a **required checkbox accepting the current Terms and VYRO EULA**, price breakdown. Billing fields accept Latin characters only for now, because invoices use a Latin font; show a friendly hint.
3. **`POST /api/v1/checkout/create`:** validate; compute price, discount and tax (§11.4); create the order (`created`) with its acceptance record and a Razorpay Order (amount in paise, `receipt` = orderNumber, `notes.orderId`); return the Razorpay order id and public key id.
4. The client opens Razorpay Checkout with prefilled details. On success it posts `razorpay_payment_id`, `razorpay_order_id` and `razorpay_signature` to **`POST /api/v1/checkout/verify`**.
5. **Verify:** check the signature (HMAC-SHA256 of `order_id|payment_id` with the key secret), then fetch the payment from Razorpay and require: `status = captured`, `order_id` = the stored `razorpayOrderId`, `amount` = order total, same currency, and the order belongs to the signed-in customer. If the payment is only `authorized`, leave it to the webhook / reconciliation. Then run fulfilment.
6. **Webhook `POST /api/v1/webhooks/razorpay`:** verify `X-Razorpay-Signature` over the raw body; store the event in `webhookEvents` keyed by the `x-razorpay-event-id` header (duplicates ignored); enqueue a job; return 200 quickly. Events: `payment.captured`, `order.paid`, `payment.failed` (log only — the customer can retry on the same order), `refund.processed`, `refund.failed`, `payment.dispute.created`. Payment events go through the same checks as step 5 before fulfilment.
7. **Fulfilment** — one DB transaction, idempotent:
   - `UPDATE orders SET status = 'paid', razorpayPaymentId = … WHERE id = … AND status IN ('created', 'expired')` — zero rows means it's already handled: stop.
   - Create the license (stubbed until Phase 8).
   - Increment the coupon's redemptions with a `redemptions < maxRedemptions` guard.
   - Allocate the invoice number: `UPDATE invoiceCounters SET next = next + 1 … RETURNING next`.
   - Write the invoice record.
   - (Raw SQL inside Payload's transaction uses its Drizzle handle — verify on the installed version.)
8. **After commit:** jobs `renderInvoicePdf` → `sendOrderEmail` (idempotent, retried; Telegram alert when retries run out).
9. **Paid twice:** a captured payment on an order already paid by a different payment flags the order, sends a Telegram alert and shows a one-click refund in admin.
10. **Reconciliation:** a scheduled job every 15 minutes fetches payments for `created` / `expired` orders younger than 72 hours and fulfils any captured one (late UPI captures). Orders are marked `expired` after 24 hours but still fulfil if a capture arrives.
11. **Success page** `/checkout/success?order=…`: renders only for the order's owner and polls until fulfilment finishes, then shows the key and a download button. The failure page offers a retry.

Use automatic capture (Razorpay capture settings). Build and test in **test mode** (Phase 7); live keys only in Phase 10.

### 11.4 Tax and invoices — confirm every setting with the CA before going live
- All dates use `Asia/Kolkata`. Test around 31 March 23:59 and 1 April 00:01 IST.
- The GST rate and SAC code come from `commerceSettings`.
- **Place of supply** = the buyer's state. When a GSTIN is entered, validate its checksum and derive (and lock) the state from its first two digits.
- Madhya Pradesh (23) → CGST + SGST. Other Indian states → IGST. Outside India → `exportTreatment` (not offered while `internationalEnabled` is false).
- **Rounding:** prices are GST-inclusive. Taxable value = price ÷ (1 + rate), rounded to the paisa; tax = price − taxable value; CGST = round-half-up(tax ÷ 2); SGST = tax − CGST.
- **Invoice numbers:** `{prefix}/{YY-YY}/{seq}`, e.g. `JI/26-27/00001` — at most 16 characters (GST rule), prefix at most 4 characters, unique within the financial year (1 April – 31 March), consecutive via `invoiceCounters`. Credit notes: `JC/26-27/00001`.
- **Invoice contents:** seller legal name, address, GSTIN and CIN; invoice number and date; buyer name and state name + code (plus address and GSTIN if given); SAC; description; quantity; taxable value; tax rates and amounts; total; "Place of supply: Madhya Pradesh (23)" (or the buyer's state); "Reverse charge: No"; signature line as the CA advises. Credit notes also say "Against invoice {number} dated {date}".
- If `gstEnabled` is false: non-GST invoices with no tax lines, and no "incl. GST" anywhere.
- Invoices never change after issue; corrections are made with credit notes.

### 11.5 Coupons
Percent or fixed amount; can be limited to certain products or plans; validity window; total and per-customer limits; applied before tax; validated on the server. A coupon can't bring the total below ₹1 (Razorpay's minimum is 100 paise) — give free copies as complimentary licenses instead.

### 11.6 Refunds and disputes
- Owner-only admin action (full or partial; reason required) → Razorpay Refunds API.
- All refund effects are driven by the `refund.processed` webhook, so refunds started from the Razorpay dashboard take the same path: update the order, issue a credit note, revoke the license on a full refund, email the customer.
- `refund.failed` → Telegram alert.
- `payment.dispute.created` → order `disputed`, license suspended, Telegram alert.
- Phase 7 only records these events; Phase 9 implements the effects.

### 11.7 Emails (React Email, English + Hindi), by phase
- **Phase 4:** lead auto-replies, internal notifications, newsletter confirmation.
- **Phase 7:** OTP code, order confirmation with the invoice.
- **Phase 8:** license key added to the order email; new device activated.
- **Phase 9:** refund processed (+ credit note); license suspended / revoked.
- **Phase 11:** ticket replies.

### 11.8 Subscriptions
The data model allows yearly and monthly plans. Build Razorpay Subscriptions only if VYRO moves to a subscription model (Phase 11).

---

## 12. Licensing, releases and updates

### 12.1 Model
- A license belongs to a customer, a product and a plan, and allows `maxActivations` devices (default 2).
- The free tier needs no license. Pro features unlock with a valid license token.
- Default policy (§22): Pro applies to a VYRO build only if the token's `upd` (updatesUntil) is null or on/after that build's release date, which VYRO embeds at build time. Older builds keep working forever.

### 12.2 License keys
- Format `VYRO-XXXXX-XXXXX-XXXXX-XXXXX`: product prefix + Crockford Base32, at least 100 random bits.
- Normalize before hashing or lookup: uppercase, strip spaces and hyphens, map O → 0 and I / L → 1.
- Stored as a SHA-256 hash (lookup), an AES-256-GCM encrypted copy (shown to the customer, and to Owner / Support in admin) and the last four characters.

### 12.3 License tokens
- JWT with header `alg: "EdDSA"` (Ed25519, `jose`) and `kid`.
- Claims: `iss` "jainav-licensing", `sub` license id, `prd` product slug, `pln` plan code (`trial` for trials), `did` device id, `upd` updatesUntil (or null), `iat`, `exp` = iat + `licenseTokenDays` (30).
- VYRO embeds the public key(s), rejects tokens whose `iss`, `prd` or `did` don't match, verifies offline, and refreshes through `/validate` after `refreshAfterDays` (7). If the network is down it keeps working until `exp`.
- `/validate` accepts tokens with a valid signature up to `tokenGraceDays` (180) past `exp`, re-checks the database and issues a fresh token. VYRO also stores the key (Windows DPAPI) so it can re-activate silently after that.
- If the server says revoked or suspended, VYRO drops to the free tier.
- The private key lives only in `LICENSING_PRIVATE_KEY`; `scripts/gen-licensing-keys` creates the pair. Public keys are served at `GET /api/v1/licensing/keys` (JWKS). Rotate with a new `kid`.

### 12.4 Licensing API v1 (full docs in `docs/licensing-api.md`, written at the start of Phase 7)
Base `https://{{DOMAIN}}/api/v1/licensing` · JSON · HTTPS only · rate-limited per IP and per key · errors look like `{ "error": { "code": "…", "message": "…" } }`.

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| `POST /activate` | `licenseKey, product, deviceId, deviceName, os, appVersion` | 200 `{ token, license: { plan, status, maxActivations, activeDevices, updatesUntil }, refreshAfter }` | 400 `invalid_request` · 404 `license_not_found` · 403 `license_revoked` / `license_suspended` · 409 `activation_limit_reached` (+ active device names) · 429 `rate_limited` |
| `POST /validate` | `token` | 200 `{ token, license }` | 401 `invalid_token` (bad signature, or expired more than 180 days ago) · 403 `license_revoked` / `license_suspended` · 404 `activation_not_found` |
| `POST /deactivate` | `licenseKey, deviceId` | 200 `{ ok: true }` | 404 · 409 `deactivation_limit_reached` `{ resetsAt }` · 429 |
| `POST /trial` | `product, deviceId, appVersion` | 200 `{ trialToken, expiresAt }` — also while an existing trial is still running | 409 `trial_used` `{ expiredAt }` once the trial has ended |
| `GET /keys` | — | JWKS | — |
| `GET /health` | — | 200 | — |

- `deviceId` = app-computed `sha256(MachineGuid + "vyro-device-v1")` in hex. The server stores only `sha256(deviceId + DEVICE_ID_PEPPER)`.
- Activating the same license on the same device again returns the existing activation and refreshes `lastSeenAt`.

### 12.5 Releases, downloads and the update feed (all Phase 3)
- Installers live in `installers` (public bucket) under `downloads/{product}/{version}/`.
- `GET /api/v1/downloads/{product}/latest?channel=stable` and `GET /api/v1/downloads/release/{id}`: count the download, then 302 to the file URL.
- The download page shows version, date, size, SHA-256, minimum OS, release notes, previous versions and how to verify the file (`Get-FileHash` in PowerShell).
- **Tauri v2 update feed:** `GET /api/v1/updates/{product}/{target}/{arch}/{current_version}` with optional `?channel=` (default `stable`).
  - Match published releases whose `platform` = `${target}-${arch}` (Tauri sends e.g. `windows` and `x86_64`) on that channel.
  - Newest version with a higher semver than `current_version` → **200** `{ "version", "notes", "pub_date" (RFC 3339), "url", "signature" }`, where `url` is the installer built with `createUpdaterArtifacts: true` and `signature` is its `.sig` contents. Otherwise → **204 No Content**.
  - **Freeze this URL before any public VYRO build ships:** `https://{{DOMAIN}}/api/v1/updates/vyro/{{target}}/{{arch}}/{{current_version}}`.
  - Later (Phase 11): VYRO may send its token as a Bearer header so the server can skip versions a license isn't eligible for.

### 12.6 VYRO app work (done in the VYRO codebase; listed here for coordination)
- Compute `deviceId`; license entry and activation screens; store the key and token with Windows DPAPI.
- Verify the JWT offline (pin `alg: EdDSA`; check `iss`, `prd`, `did`); refresh schedule and silent re-activation (§12.3); free / Pro gating.
- Embed the build's release date; before installing an update, compare its `pub_date` with `upd` and warn instead of auto-updating if the update is beyond the customer's update period.
- Updater endpoint (frozen URL above) + updater public key.
- "Buy Pro" opens `/products/vyro/pricing?ref=app`; "Manage devices" opens `/account/licenses`.
- Code-sign the installer (or ship through the Microsoft Store) to avoid SmartScreen warnings.

---

## 13. Forms, leads and notifications
- **Forms:** contact; start-a-project (steps: service → project → budget range → timeline → contact details + consent); waitlist (per product); newsletter; careers application (CV → `privateFiles`); data request.
- **Pipeline:** Zod validation → Turnstile → rate limit (IP + email) → honeypot → save the lead with a consent record (text version, time, hashed IP) → notify (email to the routed inbox + Telegram message linking to the lead in admin) → localized auto-reply.
- **Consent UI:** a short plain-language notice beside the submit button; a separate, unticked box for marketing emails; a link to the privacy policy.
- **Newsletter:** double opt-in through `/api/v1/forms/newsletter/confirm?token=…` (token stored hashed). Every marketing email carries a one-click unsubscribe link (`/api/v1/forms/unsubscribe?token=…`) plus `List-Unsubscribe` and `List-Unsubscribe-Post` headers.
- **Waitlists:** "Email this waitlist" sends only to leads whose marketing consent is given, not withdrawn and not unsubscribed.
- **Booking:** "Book a call" opens the scheduler link from settings (Cal.com or Calendly), loaded only on click.

---

## 14. Animation and interaction
- **Library:** Motion only at launch. GSAP only if Motion can't do a sequence (record why). No smooth-scroll library.
- **Everywhere:** scroll reveals (fade + 12–24 px rise, 400–700 ms, 60–90 ms stagger); word-by-word headline reveals; count-up stats; magnetic primary buttons on mouse devices only; marquee strips; page transitions only if View Transitions are stable in the installed Next.js.
- **Home hero:** an animated, pointer-reactive gradient mesh (CSS/SVG or 2D canvas). Static first paint; pauses off-screen and when the tab is hidden. A WebGL version is a Phase 11 upgrade.
- **Product cards:** tilt (max 6°), cursor spotlight, muted preview loop on hover / in view (on mobile only one plays at a time).
- **Product hero animations:**
  - **MenuMesh:** scroll-linked phone mockup (Motion `useScroll` / `useTransform`): scan the table QR → browse the menu → add to cart → the order appears on a kitchen screen.
  - **VYRO:** animated CPU/GPU speedometers and a temperature graph in the app's style (SVG + Motion; clearly illustrative values).
  - **Baby:** a voice orb (SVG or canvas) animating to a scripted English / Hindi / Hinglish conversation; "Hear Baby speak" audio samples (play on click only).
- **Rules:** animate only `transform` and `opacity`; nothing delays LCP; CLS < 0.1; every animation has a reduced-motion version; timing and easing come from tokens.

---

## 15. Budgets: SEO, performance, accessibility
- **Lighthouse (mobile)**, measured on English production URLs (staging is `noindex`) for Home, Products, a product page and a blog post: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- **Core Web Vitals:** LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- **JavaScript:** initial route JS about 180 KB gzipped or less, not counting lazy-loaded media.
- **Images:** `next/image`, AVIF/WebP, responsive sizes, blur placeholders. **Fonts:** `next/font`, subsets, `display: swap`.
- **SEO:** per-page metadata (L); canonical; hreflang (§6); `sitemap.xml` with alternates; `robots.txt` blocks `/admin`, `/account`, `/checkout`, `/api` (and all of staging); JSON-LD: Organization, WebSite, BreadcrumbList, SoftwareApplication (with VYRO's price), BlogPosting, JobPosting, FAQPage.
- **Share images:** `next/og` templates per page type with colors from `tokens.generated.ts`; products use their accent color; Hindi pages use the English image (§6).
- **Accessibility:** WCAG 2.1 AA; skip link; focus management for menus and dialogs; captions for videos; form errors announced to screen readers.

---

## 16. Security and privacy (India's DPDP Act)
- **CSP:** pages are static, so use a static CSP header (nonces would force every page to render dynamically): `script-src 'self' 'unsafe-inline'` + the exact origins Razorpay Checkout, Turnstile, Umami and Sentry document; `style-src 'self' 'unsafe-inline'`; `frame-src` for Razorpay, Turnstile, the scheduler and the Embed allow-list; `frame-ancestors 'self'`; `object-src 'none'`; `base-uri 'self'`. Optionally a stricter nonce-based CSP on the dynamic `/account` and `/checkout` routes.
- **Other headers:** HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Cloudflare:**
  - Bot Fight Mode **off** — it can't be bypassed for API traffic and would break VYRO activation, the update feed and webhooks.
  - A WAF skip rule for `/api/v1/(licensing|updates|webhooks|downloads)/*`.
  - The origin firewall accepts only Cloudflare's IP ranges; Caddy uses a Cloudflare Origin CA certificate; SSL "Full (strict)".
- **Rate limits** (keyed on `CF-Connecting-IP`): OTP request and verify, forms, checkout creation, licensing endpoints, `/go/`.
- **Admin:** Cloudflare Access on `/admin*` and `/api/users/*`; Payload `maxLoginAttempts: 5` and a 15-minute lock; strong passwords; TOTP 2FA in Phase 11.
- **Data map:** `docs/privacy-data-map.md` lists what personal data is collected, why, where it is stored and how long it is kept.
- **Consent:** stored with each lead and customer; withdrawing is as easy as giving (unsubscribe links, account toggle).
- **Data requests:** form → `dataRequests` → handled by Support or Owner.
- **Retention defaults (adjust after legal review):** leads 24 months after last activity; orders and invoices per tax law; logs 30–90 days.
- **Uploads:** type and size checks; private files served only through short-lived signed URLs.
- **Dependencies:** `pnpm audit` in CI; Renovate or Dependabot.

---

## 17. Analytics and insights
- Umami on all public pages, with events: `cta_click` {product, type}, `chip_click`, `form_submit` {type}, `checkout_start`, `download`, `language_switch`, `theme_switch`. Purchases are recorded on the server.
- Server-side daily counters in `dailyStats` for `/go/` clicks and downloads (the numbers of record).

---

## 18. Infrastructure and DevOps

### 18.1 Environments
- **Local:** Docker Postgres + `pnpm dev`; Payload schema push allowed.
- **Staging:** `staging.{{DOMAIN}}`; Razorpay test keys; basic auth (except `/api/v1/webhooks`, `/api/v1/licensing`, `/api/v1/updates`, `/api/v1/downloads`); `noindex`.
- **Production:** `{{DOMAIN}}`.

### 18.2 Hosting (default)
- VPS: 4 GB RAM, 2 vCPU, Ubuntu LTS, in Mumbai / Bengaluru or Singapore.
- Docker Compose services: `app` (Next.js + Payload), `postgres`, `umami`, `caddy`, `backup` (cron).
- Cloudflare in front (§16); external uptime monitor with its public status page on `status.{{DOMAIN}}`.
- If Tanishq chooses Vercel Pro + managed Postgres instead, only §18 changes.

### 18.3 CI/CD (GitHub Actions)
- **Pull request:** install, lint, typecheck, unit + integration tests (Postgres service container), token check, i18n check, build with `SKIP_DB_AT_BUILD=1`.
- **Merge to main:** build the staging image (staging `NEXT_PUBLIC_*` values as build args) → GHCR → deploy to staging → migrations run on container start (`prodMigrations`) → Playwright smoke tests.
- **Release tag:** build the production image with production build args → manual approval → deploy → smoke test. Rollback = redeploy the previous production image; keep migrations backward-compatible for one release.
- `NEXT_PUBLIC_*` values are baked in at build time, so never promote a staging image to production.
- Production never uses schema push; every schema change ships as a Payload migration.

### 18.4 Backups and monitoring
- Nightly encrypted `pg_dump` to R2 (keep 30 daily + 12 monthly); monthly restore test (runbook in `docs/runbooks/`).
- The external monitor checks the home page, `/api/v1/licensing/health` and the update feed; alerts go to Telegram.
- Sentry for browser and server errors; Telegram alerts when jobs exhaust their retries.

### 18.5 Environment variables (`.env.example`)
```
NODE_ENV, NEXT_PUBLIC_SITE_URL, DATABASE_URL, PAYLOAD_SECRET, CRON_SECRET, STAGING_BASIC_AUTH, SKIP_DB_AT_BUILD
S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_PRIVATE_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
NEXT_PUBLIC_CDN_URL, DOWNLOADS_BASE_URL
RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
OTP_PEPPER
LICENSING_PRIVATE_KEY, LICENSING_KEY_ID, LICENSE_KEY_ENCRYPTION_KEY, DEVICE_ID_PEPPER
NEXT_PUBLIC_UMAMI_URL, NEXT_PUBLIC_UMAMI_WEBSITE_ID
SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN
```

### 18.6 DNS and email
- Records: apex, `www` (301 to apex), `staging`, `status`, `cdn` / `downloads` (R2 custom domains), Resend sending domain (SPF, DKIM), DMARC (start at `p=none` with reports; move to `quarantine` after 2–4 clean weeks).
- Mailboxes (hello@, sales@, support@, careers@, privacy@) with the provider Tanishq chooses.

---

## 19. Testing
- **Unit:**
  - Tax: Madhya Pradesh, other state, GST off, rounding and the CGST/SGST split; GSTIN checksum and state derivation.
  - Invoices: numbering, financial-year rollover in IST (31 Mar 23:59 / 1 Apr 00:01), 16-character limit, concurrency.
  - Coupons, including the ₹1 floor.
  - Licensing: key generation, normalization and hashing; token signing / verification and the 180-day grace; activation and deactivation limits; trial idempotency.
  - Product-button logic; update-feed matching (platform, channel default, semver).
- **Integration:**
  - Razorpay signature checks (fixtures); verify rejects an amount or order mismatch.
  - Webhook idempotency (duplicate and out-of-order events); a late capture on an `expired` order fulfils; paid-twice flagging; reconciliation job.
  - Publishing a product revalidates both `/products/x` and `/hi/products/x`.
- **E2E (Playwright + axe):**
  - Language switch keeps the page; product button variants.
  - Contact form (Turnstile test keys); waitlist; newsletter confirm and unsubscribe.
  - OTP sign-in (test mailbox).
  - Checkout in test mode; the success page refuses other customers.
  - Account device deactivation.
- **`scripts/license-test-client`:** a CLI that behaves like VYRO (activate, validate, deactivate, trial, update check).
- **Visual:** `/styleguide` screenshots in light/dark × English/Hindi.

---

## 20. Phases

| Phase | Outcome |
|---|---|
| 0 | Project skeleton and guardrails |
| 1 | Content model and admin panel |
| 2 | Design system and motion primitives |
| 3 | All public pages in English and Hindi, incl. VYRO downloads and update feed |
| 4 | Forms, leads and notifications |
| 5 | Signature animations and polish |
| 6 | **Launch 1 — company website live** |
| 7 | Customer accounts, checkout and invoices (test mode) |
| 8 | Licensing |
| 9 | Store operations: refunds, disputes, reports |
| 10 | **Launch 2 — VYRO store live** |
| 11+ | Growth features |
| Anytime | Brand swap when the logo arrives |

Each phase lists its tasks (copy them into `PROGRESS.md`), what "done" means, and the inputs it needs. Placeholders are fine unless an input is marked **required**.

### Milestone A — Foundation

#### Phase 0 — Setup and guardrails
- [ ] Scaffold non-interactively, e.g. `pnpm dlx create-payload-app@latest -n jainav-site -t blank --db postgres --use-pnpm --no-git` (check `--help` for the installed version's flags), then move the files to the repository root. Latest stable Payload 3.x; Next.js 16.2.x; Node 24.
- [ ] Use the official `website` template's source as a reference for live preview, on-demand revalidation and plugin wiring.
- [ ] TypeScript strict, ESLint (`eslint .`), Prettier, Husky + lint-staged, commitlint.
- [ ] Tokens pipeline: `brand.config.ts` (placeholder seeds) → `pnpm tokens:build` → `tokens.css` + `tokens.generated.ts` with contrast checks; `globals.css` with `@custom-variant dark`, `@theme inline` and the default palette reset; `next-themes` (`data-theme`) without a flash.
- [ ] `next-intl`: routing (§4.4), messages files, `proxy.ts` with the exclusions, `[locale]` layout that sets `lang`.
- [ ] Fonts via `src/styles/fonts.ts` (Plus Jakarta Sans, Mukta).
- [ ] `docker/compose.dev.yml` (Postgres) and `.env.example`.
- [ ] Scripts: `check:tokens`, `check:i18n`; `SKIP_DB_AT_BUILD` handling.
- [ ] GitHub Actions workflow for pull requests (with a Postgres service container).
- [ ] `CLAUDE.md` (§3), `PROGRESS.md`, `docs/decisions.md`.

**Done when:** `/` and `/hi` render a placeholder layout; the theme toggle works without a flash; `/admin` sign-in works; a hex color or `bg-red-500` in a component fails `check:tokens`; a missing Hindi key fails `check:i18n`; changing a seed in `brand.config.ts` and running `tokens:build` re-themes the site; CI is green.
**Inputs:** domain name (placeholder OK).

#### Phase 1 — Content model and admin
- [ ] Payload localization (`en`, `hi`, fallback on).
- [ ] Collections: users (owner, editor, support; login lockout), media, installers, products, plans, releases, docs, services, pages, posts, changelog, testimonials, faqs, team, jobs, legalPages, shortLinks, leads, dataRequests, auditLog, dailyStats. Globals: siteSettings, navigation.
- [ ] Page blocks (§8.2) and product blocks (§8.4) with localized inner text fields; product button fields and validation (§8.5); `hiStatus` (§6).
- [ ] Release hooks: compute SHA-256 and size from the installer.
- [ ] Access control (§9.3); GraphQL disabled; drafts on products, services, pages, posts, docs, jobs, legalPages, testimonials.
- [ ] Plugins: SEO, redirects; R2 storage for media and installers (local disk in development).
- [ ] Audit-log hooks; revalidation hooks for both locales (skipped when `req.context.disableRevalidate`).
- [ ] Admin navigation groups; placeholder admin branding.
- [ ] Idempotent seed script (sets `disableRevalidate`): settings with placeholders, navigation, pages, services, the products and plans in Appendix A, sample FAQs, legal drafts. English copy plus draft Hindi (`hiStatus = draft`).

**Done when:** an Editor creates a product with English and Hindi text, saves a draft and publishes it; an Editor can't publish releases or legal pages; Support can't edit content; anonymous REST requests get no drafts and nothing from leads or other private collections; the audit log records changes; the seed runs twice safely.
**Inputs:** company details (placeholders OK).

#### Phase 2 — Design system and motion
- [ ] Components (§5.6) and motion primitives (word-based TextReveal using `Intl.Segmenter`).
- [ ] Reduced-motion handling.
- [ ] `/styleguide` (not in production).

**Done when:** every component renders in light/dark × English/Hindi without overflow or clipped matras; keyboard use and focus work; axe checks pass; there are no color literals; reduced motion turns off non-essential motion.

### Milestone B — Company website live (Launch 1)

#### Phase 3 — Public pages
- [ ] Global layout: header + mega-menu, footer + legal block, announcement bar.
- [ ] Home; Products hub; product pages in both modes with every product block; button logic (§8.5); `/go/` redirects + counters; vanity redirects via the not-found handler (§8.6).
- [ ] Live preview in both languages.
- [ ] Hosted sub-pages: pricing (display only; buying disabled until `storeEnabled`), download, changelog, docs, support (FAQ + contact form).
- [ ] Download endpoints + counters and the Tauri update feed (§12.5).
- [ ] Services (+ pillar pages), About, Contact (layout), Careers (+ JobPosting), Blog (+ RSS feeds), Changelog, Legal pages, 404 / 500 / maintenance.
- [ ] SEO: metadata, canonical / hreflang / sitemap per §6, robots, JSON-LD; share images.

**Done when:** every Phase 3 route works in English and Hindi; hreflang, canonical and sitemap follow §6; empty blocks render nothing; the button logic is unit-tested; publishing a product updates both its English and Hindi pages immediately; the update feed returns 204 / 200 correctly for `windows` / `x86_64`; the §15 budgets are met; there are no hard-coded strings.
**Inputs:** product copy, screenshots and videos; MenuMesh URL; Baby status; founder details; social links. If a VYRO build will be public at Launch 1: the installer + `.sig`, built with the frozen update-feed URL.

#### Phase 4 — Forms, leads and notifications
- [ ] `privateFiles` collection (private bucket, signed URLs).
- [ ] All forms (§13) with Turnstile, rate limits, honeypot and consent records; newsletter double opt-in and one-click unsubscribe.
- [ ] Resend + React Email templates (English / Hindi): auto-replies, internal notifications, newsletter confirmation.
- [ ] Telegram alerts.
- [ ] Leads admin views and CSV export; data-request handling.
- [ ] WhatsApp button; scheduler link.

**Done when:** each form saves a lead with consent, sends the notifications and shows a localized success message; spam attempts (honeypot, rate limit) are blocked; newsletter confirm and unsubscribe work; CVs are reachable only through signed URLs; CSV export works.
**Inputs:** Resend account + sending domain, Turnstile keys, Telegram bot + chat id, WhatsApp number, inbox addresses, scheduler link.

#### Phase 5 — Signature animations and polish
- [ ] Home hero gradient mesh; MenuMesh, VYRO and Baby hero animations; feature scroller; product card effects; micro-interactions.
- [ ] Performance tuning.

**Done when:** the §15 budgets still pass; reduced-motion behavior is verified, and so is behavior under 6× CPU throttling; animations cause no layout shift.
**Inputs:** product screen recordings; Baby voice samples.

#### Phase 6 — Deploy and launch the company website
- [ ] Provision the VPS; Docker images; `compose.prod.yml` (app, postgres, umami, caddy, backup).
- [ ] Cloudflare: DNS, SSL Full (strict), Origin CA certificate, origin firewall, WAF skip rule, Bot Fight Mode off, Access on `/admin*` and `/api/users/*`; R2 buckets + custom domains.
- [ ] Staging and production; per-environment image builds; deploy workflows; `prodMigrations`.
- [ ] Sentry, Umami, external uptime monitor + status page; Telegram alerts.
- [ ] Backups + restore runbook (run a real restore test).
- [ ] Security headers / CSP (§16).
- [ ] SPF / DKIM / DMARC.
- [ ] Final content check; Owner publishes the legal pages (§8.13).

**Done when:** production runs on HTTPS with A-grade security headers; `/admin` requires Cloudflare Access; a restore test succeeds; uptime alerts reach Telegram; mail-tester scores at least 9/10; the six pages Razorpay checks are live (Contact, Pricing, Terms, Privacy, Cancellation & Refunds, Shipping).
**After launch (Tanishq):** once the pricing page shows real VYRO prices, apply for Razorpay activation using this website.
**Inputs (required):** VPS, Cloudflare account, DNS access, final company details, approved legal texts (+ EULA if a download is live). VYRO prices are needed before the Razorpay application.

### Milestone C — VYRO store live (Launch 2)

#### Phase 7 — Accounts, checkout and invoices (Razorpay test mode)
- [ ] First: write `docs/licensing-api.md` (§12.4) so VYRO app work can start in parallel.
- [ ] `customers`, `otpChallenges`, `customerSessions`; OTP sign-in and sessions (§11.2); account shell (overview, orders & invoices, settings); add `customer` to `dataRequests`.
- [ ] `orders`, `invoices`, `invoiceCounters`, `webhookEvents`, `coupons`; `commerceSettings`.
- [ ] Checkout flow (§11.3) incl. acceptance checkbox, verify, webhook, fulfilment transaction, post-commit jobs, paid-twice flagging, reconciliation job, success / failure pages.
- [ ] Tax engine, invoice numbering and PDF (§11.4); emails for this phase (§11.7).
- [ ] Refund and dispute events recorded (effects in Phase 9).

**Done when:** a test-mode purchase works end to end, including the webhook; a duplicate webhook doesn't fulfil twice; verify rejects a wrong amount or order; a late capture on an expired order still fulfils; tax, numbering and time-zone tests pass; the PDF contains every §11.4 field; the success page refuses other customers; emails work in both languages.
**Inputs (required):** Razorpay test keys; VYRO plans and prices; GST status, SAC code and export treatment from the CA; invoice prefix.

#### Phase 8 — Licensing
- [ ] `licenses`, `activations`, `trials`.
- [ ] Key generation, normalization and storage; licensing API (§12.4); JWT signing + JWKS; grace re-issue.
- [ ] Fulfilment creates real licenses; the license key goes into the order email; new-device email.
- [ ] Account: Licenses page with device deactivation; Downloads page.
- [ ] Complimentary license issuing (admin endpoint); `license-test-client`.

**Done when:** the test client activates, hits the device limit, deactivates (and hits the monthly limit), validates (including a token 100 days past expiry), and starts and resumes a trial; a revoked license fails validation; the account page shows devices and frees one.
**Inputs:** key pair (generated by the script; private key into secrets); confirmation of the activation limit, trial length and updates policy.

#### Phase 9 — Store operations
- [ ] Refunds (Owner endpoint) and the `refund.processed` path: credit notes, license revocation, emails; `refund.failed` alerts.
- [ ] Disputes: order `disputed`, license suspended, alert.
- [ ] Resend license email; re-render invoice PDF; one-click refund for paid-twice orders.
- [ ] Monthly CA report (invoices + credit notes + SAC summary); leads report.
- [ ] "Email this waitlist" (consented leads only).
- [ ] Simple insights: `dailyStats` views + Umami link.

**Done when:** a test-mode refund (from admin and from the Razorpay dashboard) updates the order, issues a credit note with the original invoice reference, revokes the license and emails the customer; report totals reconcile with orders and credit notes; a test dispute suspends the license.

#### Phase 10 — Store go-live
- [ ] Switch to Razorpay live keys (after activation).
- [ ] A real purchase with a small amount, then a refund.
- [ ] Owner publishes the final Terms, Refunds and VYRO EULA.
- [ ] Production smoke tests; set `storeEnabled = true`.

**Done when:** a live purchase, activation in the real VYRO app, a refund and its credit note all succeed.
**Inputs (required):** Razorpay activation + live keys; approved legal texts; a signed VYRO build that uses the licensing API.

### Milestone D — Growth (Phase 11+; order agreed after Launch 2)
- Admin: custom dashboard; support tickets; Translator role + Translations view + "Draft Hindi with AI"; TOTP 2FA.
- Look and feel: WebGL home hero; GSAP sequences if needed.
- Store: Google sign-in; subscriptions (if chosen); international payments (if enabled); volume licenses and quantity > 1; update-feed eligibility via Bearer token.
- Baby: shared commerce API + cross-domain sign-in for Baby's website.
- Growth: AI assistant (English / Hindi) answering from site content, with hand-off to WhatsApp or the contact form; MenuMesh live demo (QR on screen → order on phone → kitchen view; needs a MenuMesh demo restaurant); VYRO "Know your machine" browser teaser (runs only in the browser; sends nothing); creator / affiliate program; verified-buyer reviews; fair comparison pages; site search (Payload search plugin, both languages); public roadmap with voting; case studies; press kit; partner / reseller program; Startup India / Udyam badges.

### Anytime — Brand swap
When the logo arrives, follow Appendix B. Target: under a day.

---

## 21. Inputs needed from Tanishq
| # | Input | Needed by |
|---|---|---|
| 1 | Domain name | Phase 0 (placeholder OK), Phase 6 (DNS) |
| 2 | Company details: registered office, CIN, incorporation date, GSTIN (if any), phone, email addresses | Placeholders until Phase 6 (required there) |
| 3 | Product copy, screenshots, videos; MenuMesh URL; Baby status | Phase 3 |
| 4 | Founder name, photo, bio, links; social links | Phase 3 |
| 5 | Whether a free VYRO download goes live at Launch 1 (then: installer + `.sig` built with the frozen feed URL, and an approved EULA) | Phase 3 / 6 |
| 6 | WhatsApp number, inbox addresses, scheduler link | Phase 4 |
| 7 | Resend, Cloudflare (DNS, R2, Turnstile, Access), Telegram bot | Phases 4–6 |
| 8 | VPS (or a decision to use Vercel) | Phase 6 |
| 9 | Approved legal texts: privacy, terms, refunds, shipping (Launch 1); EULA (Launch 1 if a download is live, otherwise Launch 2) | Phases 6 and 10 |
| 10 | VYRO pricing model and prices | Before the Razorpay application; Phase 7 |
| 11 | GST status, SAC code, export treatment, invoice format — from your CA | Phase 7 |
| 12 | Razorpay test keys; live keys after activation | Phases 7 and 10 |
| 13 | Signed VYRO build that uses the licensing API | Phase 10 |
| 14 | Logo and brand kit | Anytime (Appendix B) |

---

## 22. Open decisions and defaults
| Decision | Default until Tanishq decides |
|---|---|
| VYRO pricing model | Free tier + Pro one-time license with 12 months of updates; builds released in that window stay Pro forever |
| Devices per license | 2; up to 3 self-service deactivations per month |
| Trial | 14-day Pro trial per device |
| Quantity per order | 1 (volume licenses later) |
| International sales at launch | Off (INR only) |
| Hosting | VPS + Docker (§18.2) |
| Admin protection | Cloudflare Access + login lockout; TOTP later |
| Mailbox provider | Tanishq's choice |

---

## Appendix A — Seed content (drafts to confirm)

**Company:** Jainav Infotech Private Limited · Indore, Madhya Pradesh, India.
**Founder:** {{FOUNDER_FULL_NAME}} — software engineer, previously at Bosch Global Software Technologies (DevOps); Google Summer of Code 2022 contributor. *(Confirm wording.)*

### Products

**1. MenuMesh**
- Tagline: "QR table ordering for restaurants."
- Summary: Guests scan the table QR, browse the menu and order from their phone. Orders reach waiters and the kitchen instantly, and managers handle menus, prices, per-table billing and printed bills.
- Features: table QR ordering · waiter assigned to each table order · waiter / kitchen panel (mark dishes served) · manager panel (menu, pricing, per-table bills, printed bills, order history) · table resets after billing · waiter reports (Growth and Pro plans) · multi-restaurant management.
- Note: the restaurant collects the food bill itself; MenuMesh generates and prints the bill.
- Settings: type `saas`, mode `external`, `externalUrl` {{MENUMESH_URL}}, status {{CONFIRM}}, platform web, primary button `visit`.

**2. Baby**
- Tagline: "Your private voice assistant for Windows."
- Summary: Talk to your PC in English, Hindi or Hinglish. The wake word, speech recognition, voice and memory run on your computer; only what's needed to answer goes to the AI model.
- PrivacyPanel — *Stays on your PC:* wake word, speech-to-text, voice, memory. *Goes to the cloud:* the text of your request (and relevant memory context) for the AI model. *(Confirm before publishing.)*
- Features: wake word · on-device speech recognition · natural voice · English / Hindi / Hinglish · local memory · safe, allow-listed system actions. *(Confirm which features ship.)*
- Settings: type `desktop`, mode `external`, `externalUrl` {{BABY_URL}}, status `coming-soon` until Baby's website is live, platform windows.

**3. VYRO**
- Tagline: "Know your machine."
- Summary: Live temperatures, fan speeds, voltages and clocks for your CPU, GPU, RAM, storage and motherboard, plus full system and multi-monitor details, in a light, fast app with animated gauges.
- Features: animated CPU/GPU speedometers with live clock speeds · temperatures (CPU, GPU, RAM, storage, motherboard) · every fan speed · voltages and clocks · full system info · single and multi-monitor details · reads sensors directly, no third-party monitoring tools · low CPU and memory use · built with Rust + Tauri.
- Plans: Free and Pro — feature split and prices {{TO_DECIDE}}.
- Settings: type `desktop`, mode `hosted`, status {{CONFIRM}}, platform windows, primary button `download` (free), secondary button `buy` (Pro plan).

**4. (Optional — only if Tanishq wants it public)** Legal AI app — `coming-soon` with a waitlist; name {{TBD}}.

### Services pillars
- **Custom software & SaaS:** web apps, SaaS platforms, mobile and desktop apps.
- **AI & ML solutions:** LLM apps and assistants, search / RAG, automation, forecasting and analytics.
- **Cloud & DevOps:** CI/CD, containers, cloud setup, monitoring, cost tuning.
- **E-commerce & web platforms:** online stores, marketplaces, portals, fast marketing sites.

### Why Jainav (draft)
Privacy by default · Fast, light software · Built in Indore, for the world · We ship our own products.

---

## Appendix B — Brand swap checklist
**Input:** the logo as SVG (preferred) or PNG ≥ 1024 px, plus any brand colors or fonts Tanishq specifies.
1. Add `public/brand/logo.svg`, `logo-mark.svg` and light/dark variants; update `<Logo />`.
2. Pick the brand (primary) and accent colors from the logo and set them as the seeds in `src/styles/brand.config.ts` (adjust the neutral tint if needed).
3. Run `pnpm tokens:build`. It regenerates every token and fails if a contrast pair misses its target; adjust the seeds or the semantic mapping in `brand.config.ts` until it passes in both themes.
4. Regenerate favicons and app icons (ICO, PNG 16–512, Apple touch, maskable), share-image templates, the email header, and the admin logo and icon.
5. If brand fonts are given: update `src/styles/fonts.ts`; recheck the Devanagari pairing.
6. Visual QA: `/styleguide` and key pages in light/dark × English/Hindi; rerun Lighthouse.
7. Commit: `feat(brand): apply Jainav brand kit`.
