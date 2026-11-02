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

Phase 4 sends a Telegram alert for every new lead except newsletter sign-ups. The backup job alerts on failure. Both need
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: the bot from @BotFather, the chat id from
`https://api.telegram.org/bot<token>/getUpdates` after messaging the bot.

## Privacy requests and grievances

Every request gets a ticket number, a due date one month away (Answer by) and, for a grievance, 48 hours to be acknowledged. The automatic email is the acknowledgement: it retries for about 15 minutes, then a Telegram alert names the job. At 09:30 IST a reminder lists open requests that aren't acknowledged, are due within 7 days or are overdue, on Telegram and to the privacy inbox, every day until they are closed.

- If the automatic email failed, reply by hand with the ticket number, then fill in **Acknowledged at**.
- The Grievance Officer's first reply to a grievance includes a copy of the complaint as recorded. The automatic email doesn't carry it.
- Enter a complaint that arrives by phone, email, WhatsApp or the contact form through the form, with the person's email address, so it gets a ticket and due dates. Correct the dates if it arrived earlier.

## Sentry (errors)

- Create a Sentry project (platform Next.js). Its DSN goes in two places:
  - `SENTRY_DSN` in production.env and staging.env, for server errors;
  - the repository variables `STAGING_SENTRY_DSN` and `PRODUCTION_SENTRY_DSN`, for browser
    errors (baked in as `NEXT_PUBLIC_SENTRY_DSN`, so redeploy afterwards).
- Project settings → Security & Privacy:
  - turn on _Prevent Storing of IP Addresses_;
  - keep _Data Scrubber_ and _Use Default Scrubbers_ on.

  The app already sends no cookies, headers other than user-agent, bodies, query strings or
  user fields (`src/lib/sentry.ts`, `src/lib/scrub.ts`).

- Events say `staging` or `production`, from the site URL.
- Browser stack traces stay minified until source maps are uploaded. That needs
  `withSentryConfig` and a `SENTRY_AUTH_TOKEN`, which aren't set up yet.
- The browser SDK loads after the page is idle, so errors thrown before that are not reported.
- Alerts: Sentry → Alerts, email the Owner on new issues.

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
