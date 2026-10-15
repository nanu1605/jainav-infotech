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
