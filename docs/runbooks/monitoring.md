# Monitoring: uptime, errors, analytics, alerts

## Uptime, heartbeats and status page

Monitoring that matters must run outside the VPS. The tool is HetrixTools (its free tier lists
Telegram alerts, heartbeats and status pages; a deviation from spec §18.4's UptimeRobot or Better
Stack, recorded in [decisions](../decisions.md)). If a limit of the free tier gets in the way,
healthchecks.io takes over the heartbeats.

- Uptime monitors, every minute:
  - `https://{{DOMAIN}}/`: HTTP 200.
  - `https://{{DOMAIN}}/api/v1/health`: HTTP 200 with `"ok":true`. The app and its database
    answer.
  - From Phase 8: `https://{{DOMAIN}}/api/v1/licensing/health`: HTTP 200 with `"ok":true`. The
    licensing keys are set and the database answers ([licensing.md](licensing.md)).
  - Staging, every 15 minutes, where its basic auth allows.
  - The site's update feed is not monitored.
- Heartbeat monitors (the job pings a URL; the monitor alerts when a ping is missing):
  - the backup job: 26 hours ([backups.md](backups.md#the-heartbeat)), URL in `.env` as
    `BACKUP_HEARTBEAT_URL`;
  - `hostwatch`: it pings after every 5-minute run, 15 minutes of grace, URL in
    `/etc/hostwatch.env` as `HEARTBEAT_URL`. This one also catches a server that is down or
    unable to reach Telegram, because the ping stops in both cases.
- Alerts: the provider's Telegram integration, to the same chat as the site's alerts
  (`TELEGRAM_CHAT_ID`). Phase 6 is done only when a test alert has reached Telegram.
- Status page on `status.{{DOMAIN}}`: create it at the provider, then add the `CNAME` it shows
  (DNS only, [cloudflare.md](cloudflare.md#dns)).

## Hostwatch

`hostwatch` runs on the server as root: `hostwatch.timer` every 5 minutes and
`hostwatch-daily.timer` at 23:00 UTC (04:30 IST). Its bot is the server's own and its messages
begin `[server]`; the site's and the backup job's begin `[jainav]`, and every app on the server has
its own bot, so one chat shows who spoke. It sends a problem once, repeats it every 6 hours while
it lasts, and sends a "resolved" line when it has been clear for a while. The timers are enabled by
hand ([server.md §3](server.md#3-first-start)); the daily run alerts when one is off. The token,
chat id and heartbeat URL are in `/etc/hostwatch.env` (root, mode 0600; it warns otherwise).

```bash
sudo hostwatch check    # the 5-minute checks, printed: no alerts, nothing saved
sudo hostwatch daily    # the daily report, sent now
```

Every 5 minutes:

- **disk:** `/` at 80% used (warning) or 90% (critical). `docker system df` shows what holds it.
- **memory, swap:** `MemAvailable` under 1.5 GiB for 3 runs in a row; more than 2 GiB of swap in
  use. Something is bigger than its limit predicts: read the daily report's peaks.
- **oom:** the kernel killed a process; the message names the container.
- **cpu:** busy above 55% of the vCPUs for 30 minutes, close to what the plan sustains.
- **throttled:** CPU steal above 10% for two runs, so the host is out of CPU credits. While it
  lasts, restore tests do not start and staging deploys are refused until it recovers, and
  production deploys still run. Stop busy staging work.
- **unhealthy, restarts:** a container is `unhealthy`, or restarted since the last run.
- **tunnel:** `cloudflared` is not active, or holds no connection to Cloudflare: no SSH and no
  deploys, though the sites keep working.
- **limits, limitsum:** a running container has no memory or CPU limit, or the sum of the limits
  plus 1.5 GiB for the host no longer fits in RAM. App-apply's throwaway check containers are
  skipped.
- **ports, listeners:** a container other than `edge-caddy-1` publishes a port, or it publishes
  more than `443/tcp`, or something listens on TCP beyond loopback.
- **firewall:** `cf-ranges verify` fails, or the INPUT policies are not DROP
  ([edge.md §4](edge.md#4-cloudflares-ranges-and-the-origin-firewall)).
- **networks:** an edge network holds anything but Caddy and its own app's containers
  ([edge.md §1](edge.md#1-how-the-edge-works)).
- **ntp, envfile, breakglass:** the clock is not synchronised; `/etc/hostwatch.env` is not
  root-only; a bootstrap or break-glass file is still there after hardening
  ([server.md §9](server.md#9-break-glass)).

Daily it reports in one quiet message, and judges what is wrong:

- **suppressed:** journald dropped lines to its rate limit.
- **journal, lines:** the journal's size against the 187-day projection, and each project's
  lines a day against its `LOG_LINE_BUDGET` ([Logs](#logs)).
- **reboot:** a package update needs a reboot, which unattended upgrades never do by themselves.
  Validate the edge, then reboot between 01:00 and 07:00 IST.
- **peaks, layers:** each container's `memory.peak` (it includes page cache) beside the day's
  largest heap, and the largest writable layers.
- **images:** it prunes dangling images, and third-party images that no installed compose file
  names.
- **redact:** an app's conf sets `LOG_REDACT=1` but its file in `log-redact.d` is missing
  ([edge.md §7](edge.md#7-log-redaction-for-other-apps)).
- **recipients:** an app's `BACKUP_RECIPIENT` (conf) and `BACKUP_AGE_RECIPIENT` (`.env`) name
  different keys.
- **timers:** an expected timer is not enabled.
- **edge-validate:** the live Caddy config no longer validates.
- **certs:** a certificate expires within 60 days (critical within 14); the authenticated-pull
  client certificate counts too, when it is stored on the server.
- **cloudflared:** its version is nearly a year old; Cloudflare supports one for a year.

If Telegram refuses a message (token revoked, bot removed from the chat), `hostwatch` keeps
`/var/lib/hostwatch/tg-failed`, stops pinging the heartbeat so that the heartbeat monitor alerts
through its own channel, and tries again every run. One-off alerts from other scripts wait and are
sent once Telegram answers. Fix the token or chat id in `/etc/hostwatch.env`. Long messages are
split into numbered parts.

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
journalctl CONTAINER_NAME=jainav-app-1 --since 2026-11-01 --until 2026-11-02   # or jainav-umami-1…
journalctl CONTAINER_NAME=edge-caddy-1 --since today          # the edge: every app's access lines
journalctl COM_DOCKER_COMPOSE_PROJECT=jainav --since today     # a whole compose project
journalctl -t sshd --since yesterday
```

Once a month, with the restore test, check that no size limit is what deletes lines:

```bash
journalctl --disk-usage             # well under SystemMaxUse (24G)
journalctl -o short-iso | head -1   # the oldest line: at least 180 days old, or the server's age if less
df -h /var/log/journal              # Avail above 5% of Size (4G at most) plus what the journal can still grow to 24G
```

If Avail is below that, free the disk: `docker system df` shows what holds it. Deploys already trim
the app and tools images, so look at the Postgres volume ([retention.md](retention.md#analytics-umami)),
retired Umami or Caddy images and build cache. Below it journald deletes its oldest files at any
usage, with no message, and raising its limits does nothing. Otherwise, if the oldest line is younger
than that, or usage nears the limit, raise `SystemMaxUse` and `SystemMaxFiles`
([server.md §7](server.md#7-change-the-server-setup)) while the disk has room. Left alone, the privacy
policy's period stops being true.

The edge's `edge-caddy-1` logs every request of every app, without request headers, the visitor's address or the query
string. `hostwatch` counts each project's lines a day against its
`LOG_LINE_BUDGET` (30000 when the app's conf in `/etc/apps` sets none; Jainav 30000, the edge 10000)
and alerts when one is over, because a journal that outgrows its budgets drops lines before the
retention period is up. Quiet a noisy success path in the Caddyfile rather than raising a budget.

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
