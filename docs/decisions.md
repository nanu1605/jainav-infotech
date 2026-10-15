# Decisions

Non-obvious choices and deviations from `JAINAV_WEBSITE_SPEC.md`. Newest at the bottom of each phase.

## Defaults from spec §22 (until Tanishq decides)

| Decision                      | Default in use                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| VYRO pricing model            | Free tier + Pro one-time license with 12 months of updates; builds released in that window stay Pro forever |
| Devices per license           | 2; up to 3 self-service deactivations per month                                                             |
| Trial                         | 14-day Pro trial per device                                                                                 |
| Quantity per order            | 1 (volume licenses later)                                                                                   |
| International sales at launch | Off (INR only)                                                                                              |
| Hosting                       | VPS + Docker (§18.2)                                                                                        |
| Admin protection              | Cloudflare Access + login lockout; TOTP later                                                               |
| Mailbox provider              | Tanishq's choice                                                                                            |
| Domain                        | `{{DOMAIN}}` placeholder; `http://localhost:3000` in development                                            |

## Phase 0

- **Next.js 16.3.8 instead of 16.2.x (deviation).** The latest stable Payload 3.x is 3.90.2, and `@payloadcms/next@3.90.2` declares `next: >=16.3.3 <17` as a peer dependency, so 16.2.x is unsupported. `create-payload-app@3.90.2` pins 16.3.3; we use the latest patch in that line (16.3.8). Spec §0.5: follow the library.
- **Payload 3.90.2.** Payload 4 is in beta (`4.0.0-beta.1`); stay on 3.x until 4 is stable.
- **pnpm 12.** The local toolchain is pnpm 12.4.1; `packageManager` pins it so CI uses the same version. pnpm 12 blocks dependency build scripts unless approved: `pnpm-workspace.yaml` → `allowBuilds` lists `esbuild`, `@swc/core`, `unrs-resolver`, `@parcel/watcher`.
- **Postgres 17** (`postgres:17-alpine`) for dev and CI; spec requires 16+.
- **Build without a database works with plain `next build`.** With `SKIP_DB_AT_BUILD=1` the `[locale]` layout's `generateStaticParams` returns `[]`; Payload routes are dynamic and don't touch the DB at build. Payload's "experimental build mode" fallback was not needed.
- **`prodMigrations` wired from day one** with an initial migration (`src/migrations/`). Development still uses schema push.
- **Shadcn `input` maps to `border-strong`, not `border` (deviation).** Spec §5.2 maps shadcn's `border` and `input` to `--border`, and also requires input borders to reach 3:1. Making every divider 3:1 would make the layout heavy, so `--border` stays a soft divider and `--input` → `--border-strong`, which is checked at 3:1. Spec intent (input borders ≥ 3:1) is kept.
- **Contrast pairs checked by `tokens:build`** (both themes): `fg` and `fg-muted` on `bg`, `bg-subtle`, `surface`, `surface-raised` ≥ 4.5; `fg-inverse` on `fg` ≥ 4.5; `primary-fg` on `primary` and `primary-hover`, `brand-accent-fg` on `brand-accent`, each status `-fg` on its status ≥ 4.5; `border-strong`, `ring`, `fg-subtle`, `primary` on `bg` and `surface` ≥ 3.
- **Scale generation.** Each seed's hue and chroma are kept; lightness follows a fixed curve per step (50 → 950, neutral 0 → 1000) so contrast stays predictable when seeds change. Colors are gamut-mapped to sRGB with culori's CSS Color 4 algorithm and emitted as hex.
- **Non-color tokens.** Radius, easing, durations and shadows are emitted in `@theme static` (they share Tailwind's `--radius-*`, `--ease-*`, `--shadow-*` namespaces, which are reset first). Shadow strength differs per theme through `--shadow-color-{sm,md,lg}`.
- **next-intl `alternateLinks: false`.** The middleware would otherwise send hreflang `Link` headers for every page; spec §6 emits hreflang only for `hiStatus = ready` pages (Phase 3).
- **Proxy matcher** excludes `/admin`, `/api`, `/go`, `/feeds`, `/_next`, `/_vercel` as whole path segments (so a future `/goals` page is still localized) and any path with a file extension.
- **Known dev-only warning:** React 19 logs "Encountered a script tag while rendering React component" for `next-themes`' inline theme script. The script runs from the server HTML (no flash); the warning doesn't appear in production. Revisit if `next-themes` ships a fix.
- **Dev admin credentials** live only in the gitignored `.env` (`DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`); the Phase 1 seed will use them.
- **Windows dev:** `next.config.ts` keeps Payload's `sassOptions.loadPaths` workaround for Turbopack on Windows.

## Phase 1

- **Collection slugs are kebab-case** (`legal-pages`, `short-links`, `data-requests`, `audit-log`, `daily-stats`, globals `site-settings`, `navigation`); the spec's camelCase names map 1:1. REST paths follow (`/api/legal-pages`).
- **Owner-only publishing** (releases, legal pages) uses two layers: create/update access that rejects `_status: 'published'` for non-owners (also hides Publish/Unpublish in the admin), plus a `beforeOperation` hook that lets non-owners only write with `draft: true`. Access alone is not enough: Payload writes the live row on any update without the draft flag, even when the body has no `_status`. Editors still see "Revert to published" and bulk publish buttons; clicking them returns 403.
- **`published` on releases is Payload's `_status`** (drafts). Unpublishing a release (Owner) removes it from the update feed.
- **Revalidation paths include the locale.** English URLs are rewritten to `/en/...` by next-intl, so hooks revalidate `/en/...` and `/hi/...`; pattern revalidation must include the route group (`/(frontend)/[locale]/...`), not `/[locale]/...` as spec §4.3 says. `revalidateTag` takes `{ expire: 0 }` (Next 16 requires a second argument). Hooks skip on `req.context.disableRevalidate` and swallow the "static generation store missing" error that next/cache throws outside a Next request (seed, tests, jobs).
- **SEO fields come from `@payloadcms/plugin-seo`** with `tabbedUI` on pages, products, services and posts, so those collections start with a `tabs` field. The plugin's meta title/description/image are localized automatically.
- **Storage:** R2 via `@payloadcms/storage-s3` only when `S3_ENDPOINT` and `S3_BUCKET` are set; local disk otherwise. `alwaysInsertFields: true` keeps the DB schema identical in both modes so migrations don't drift. Public files get CDN URLs (`NEXT_PUBLIC_CDN_URL`, `DOWNLOADS_BASE_URL`). The private bucket arrives with `privateFiles` in Phase 4.
- **Installer files are immutable.** Replacing the file of an installer is rejected through the API (any role): a published release must keep shipping the bytes, SHA-256 and update signature the Owner approved. A new build is a new installer and a new release. An installer referenced by a release can't be deleted, and file facts (size, MIME type) are only ever set by the upload, never by API edits.
- **Installer uploads:** root upload limit raised to 512 MB with temp-file streaming. `.exe` is sniffed as `application/x-msdownload` and `.msi` as `application/x-cfb`; both are accepted, the extension is enforced in a hook, and the stored MIME type is normalized. Filenames stay globally unique (Payload appends `-1`); the storage prefix `downloads/{product}/{version}/` is set only when a file is uploaded.
- **Audit log** is a small plugin that appends hooks to every collection and global (skipping the log itself and `daily-stats`); entries are written in the same transaction. The spec's `collection` field is named `entity`, `at` is the built-in `createdAt`, and `actorEmail` snapshots the actor because the user relationship is cleared if the user is deleted. Summaries never include titles of leads, data requests, users or testimonials (emails, customer names): the log can't be edited or deleted, so personal data there could never be erased (spec §16).
- **Live-row tracking (`src/plugins/liveDoc.ts`).** For draft-enabled collections Payload passes the latest _version_ to afterChange as `previousDoc`, which may be an unpublished draft. A small plugin records the live row and whether the write only saves a draft (mirroring Payload's rule, so bulk "Publish many", which sends the draft flag with `_status: published`, counts as a publish); revalidation uses it (draft saves revalidate nothing; unpublish and slug changes expire the URL that was live) and so does the audit log (`[draft saved]` vs `[published → draft]`).
- **Localized `required` means "required in English" (`src/plugins/defaultLocaleRequired.ts`).** Payload validates `required` against the locale being saved, which would block saving partial Hindi or publishing from the Hindi admin, and makes non-draft locale columns NOT NULL. Spec §6 expects partial Hindi with English fallback, so the plugin makes those fields optional in the schema and applies `required` only when saving English or creating a document (a new document has no English yet), passing it through to Payload's own per-type validators. Side effect: the admin no longer shows a required asterisk on them.
- **Lead and data-request submissions are records.** Staff can change status, notes, assignee and record a marketing-consent withdrawal; the submitted fields and consent records ignore API edits (field-level update access), not just admin read-only inputs.
- **Legal pages keep every version** (`maxPerDoc: 0`), because the published texts are what visitors and buyers agreed to; other collections keep 50. The effective date is required on publish.
- **Media** accepts images (not SVG, which can carry scripts), MP4/WebM video and `.vtt` captions, checked by extension; `text/plain` is only in the MIME list because Payload can't sniff `.vtt`.
- **No Translation tab on products** (spec §10 lists one): `hiStatus` stays a top-level sidebar field as §6 says, so it works as a list column and filter and is visible on every tab. A Translations view is planned for Phase 11.
- **Only the Owner can unlock admin accounts**, so the login lockout also protects the Owner from other admins.
- **`daily-stats.date` is text `YYYY-MM-DD`** (IST business date) so the Phase 3 `INSERT … ON CONFLICT (date, kind, key)` upsert stays simple.
- **Tests use a separate `jainav_test` database** brought up to date with `payload migrate` in a Vitest global setup (dev schema push disabled via `PAYLOAD_MIGRATING`). `pnpm check:migrations` (also in CI) compares the config's schema with the newest migration snapshot, so a forgotten migration fails the build (spec §18.3).
- **Migrations were squashed** into one initial migration during Phase 1; nothing had been deployed. From the first deploy on, migrations are only ever added.

## Phase 2

- **New dependencies are pinned to releases at least two weeks old** (supply-chain cool-off): motion 13.4.6 (motion 14 was a week-old major), radix-ui 1.6.7, zod 4.6.5, react-hook-form 7.89.0, @marsidev/react-turnstile 1.6.1, @axe-core/playwright 4.13.0. pnpm 12's own `minimumReleaseAge` check also rejects same-day releases; never bypass it with exclusions.
- **Motion** loads lazily (`LazyMotion` + `domAnimation`, `m.*` components) and honours reduced motion globally (`MotionConfig reducedMotion="user"`); continuous effects also check `useReducedMotion()`.
- **No page transitions:** View Transitions are not in stable React 19.2 / Next 16.3, so per spec §5.6 they are skipped.
- **Theme tokens apply to nested `data-theme` wrappers** (light block on `:root, [data-theme='light']`, shadcn aliases re-declared on `[data-theme]`), so the styleguide shows light and dark side by side.
- **`/styleguide`** is on in development and 404s in production unless `ENABLE_STYLEGUIDE=1` (staging). It's `noindex`.
- **Playwright on this machine** uses the installed Chrome (`PLAYWRIGHT_CHANNEL=chrome` in `.env`): Playwright's own Chromium download hangs while extracting here.
- **TextReveal splits at whitespace, not at `Intl.Segmenter` word boundaries** (deviation from spec §3/§20). It is still word-based and never splits inside a Devanagari word, but segmenter boundaries also fall between "₹" and "1,00,000", between a quote and its word, and around non-breaking spaces; each piece is an inline-block, so those boundaries would let the animated headline wrap where the plain text cannot. Splitting where the text already has a breakable space keeps wrapping identical.
- **Initial JS budget (spec §15, ~180 KB gzipped):** the placeholder home page measured 210 KB with every Phase 2 provider loaded eagerly. Three changes bring it to ~181 KB before hydration (+11 KB of Motion features right after): the Radix toast UI loads with the first `toast()` call, Motion's `domAnimation` features load asynchronously (`LazyMotion features={() => import(...)}`), and next-intl precompiles ICU messages at build time (`experimental.messages.precompile`, next-intl 4.14), which drops the message parser from the client. Next.js + React alone are ~122 KB, so Phase 3 pages need to keep heavy client code (mobile menu, mega menu, forms) lazy.
