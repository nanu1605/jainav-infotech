# syntax=docker/dockerfile:1
# Production image (spec §18). Built in CI without a database (SKIP_DB_AT_BUILD=1): pages render
# on first request and are then cached. NEXT_PUBLIC_* values are baked in at build time, so each
# environment gets its own image; never promote a staging image to production.
#
#   docker build -f docker/Dockerfile --target runner -t jainav-app .
#   docker build -f docker/Dockerfile --target tools -t jainav-tools .

ARG NODE_IMAGE=node:24.17.0-alpine

FROM ${NODE_IMAGE} AS base
# libc6-compat: prebuilt native modules that expect glibc symbols. HUSKY=0: no git hooks here.
RUN apk add --no-cache libc6-compat && corepack enable
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    corepack install && pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_UMAMI_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NODE_ENV=production SKIP_DB_AT_BUILD=1 NEXT_OUTPUT=standalone
# The build never connects to a database; Payload only needs a non-empty secret to load its
# config. This one lives only for this command, never in an image layer's environment.
RUN PAYLOAD_SECRET=build-only pnpm build

# One-off commands against an environment's database: seed, release import, migrate.
#   docker run --rm --env-file .env.production jainav-tools pnpm payload migrate:status
FROM deps AS tools
COPY . .
ENV NODE_ENV=production
CMD ["pnpm", "payload", "migrate:status"]

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
# /api/v1/health also initializes Payload, which applies pending migrations on start.
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "server.js"]
