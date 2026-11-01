# Monitoring: uptime, errors, analytics, alerts

## Uptime monitor and status page (spec §18.4)

It must run outside the VPS, so use UptimeRobot or Better Stack (free tier).

- Monitors, every 1–5 minutes:
  - `https://{{DOMAIN}}/`: HTTP 200.
  - `https://{{DOMAIN}}/api/v1/health`: HTTP 200 with `"ok":true`. The app and its database
    answer.
  - From Phase 8: `https://{{DOMAIN}}/api/v1/licensing/health`: HTTP 200 with `"ok":true`. The
    licensing keys are set and the database answers ([licensing.md](licensing.md)).
- Alerts: the provider's Telegram integration, to the same chat as the site's alerts
  (`TELEGRAM_CHAT_ID`). Phase 6 is done only when a test alert has reached Telegram.
- Status page on `status.{{DOMAIN}}`: create it at the provider, then add the `CNAME` it shows
  (DNS only, [cloudflare.md](cloudflare.md#dns)).

## Telegram alerts from the site

Phase 4 sends a Telegram alert for every new lead. The backup job alerts on failure. Both need
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: the bot from @BotFather, the chat id from
`https://api.telegram.org/bot<token>/getUpdates` after messaging the bot.

## Sentry (errors)

- Create a Sentry project (platform Next.js). Its DSN goes in two places:
  - `SENTRY_DSN` in production.env and staging.env, for server errors;
  - the repository variables `STAGING_SENTRY_DSN` and `PRODUCTION_SENTRY_DSN`, for browser
    errors (baked in as `NEXT_PUBLIC_SENTRY_DSN`, so redeploy afterwards).
- Project settings → Security & Privacy:
  - turn on _Prevent Storing of IP Addresses_;
  - keep _Data Scrubber_ and _Use Default Scrubbers_ on.

  The app already sends no cookies, headers other than user-agent, bodies, query strings, user
  fields, spans or console lines, and browsers send no session records. It filters the Telegram
  bot token, Payload's password reset token, database values, email addresses and phone numbers
  from text (`src/lib/sentry.ts`, `src/lib/scrub.ts`). Don't set `SENTRY_TRACES_SAMPLE_RATE`: it
  turns on spans, which skip these filters.

- Events say `staging` or `production`, from the site URL.
- Browser stack traces stay minified until source maps are uploaded. That needs
  `withSentryConfig` and a `SENTRY_AUTH_TOKEN`, which aren't set up yet.
- The browser SDK loads after the page is idle, so errors thrown before that are not reported.
- Alerts: Sentry → Alerts, email the Owner on new issues.

## Logs

Every long-running service logs to the host's journal, so a deploy keeps the old container's
lines. A line stays at least 180 days and at most 187 ([decisions](../decisions.md), "Logs are
kept").

```bash
journalctl CONTAINER_NAME=jainav-app-1 --since 2026-11-01 --until 2026-11-02   # or jainav-caddy-1…
journalctl -t sshd --since yesterday
```

Once a month, with the restore test, check that no size limit is what deletes lines:

```bash
journalctl --disk-usage             # well under SystemMaxUse (8G)
journalctl -o short-iso | head -1   # the oldest line: at least 180 days old, or the server's age if less
df -h /var/log/journal              # Avail above 5% of Size (4G at most) plus what the journal can still grow to 8G
```

If Avail is below that, free the disk (`docker images`: old `tools-*` images, keeping the deployed
commits'). Below it journald deletes its oldest files at any usage, with no message, and raising its
limits does nothing. Otherwise, if the oldest line is younger than that, or usage nears the limit,
raise `SystemMaxUse` and `SystemMaxFiles` ([server.md §1](server.md#1-provision-the-vps)) while the
disk has room. Left alone, the privacy policy's period stops being true.

## Umami (analytics)

Umami runs on the VPS at `https://analytics.{{DOMAIN}}`. It is cookie-free, so the site has no
cookie banner.

1. Sign in with Umami's default account (`admin` / `umami`) and **change the password
   immediately**.
2. Settings → Websites → Add `{{DOMAIN}}`. Copy its website ID into the repository variable
   `PRODUCTION_UMAMI_WEBSITE_ID`, and set `PRODUCTION_UMAMI_URL` to
   `https://analytics.{{DOMAIN}}`. Leave the `STAGING_UMAMI_*` ones empty, so tests don't count.
   Redeploy.
3. Events (spec §17):
   - `cta_click`, `chip_click` and `download` come from `data-umami-event` attributes on
     wrapper elements;
   - `form_submit`, `language_switch` and `theme_switch` come from `src/lib/analytics.ts`;
   - `checkout_start` arrives in Phase 7.

The numbers of record for `/go/` clicks and downloads are the server-side counters in
`dailyStats`, not Umami.
