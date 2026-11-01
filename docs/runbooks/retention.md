# Retention: how long data stays

The Privacy Policy states these periods. Change it whenever you change one, and bump its version.

## Settings → Retention settings (Owner)

A daily job (`cleanup`, 09:00 IST) applies them and tells Telegram how many records went, as counts only.

- **Leads and their CVs:** 24 months after a lead's **Last contact**, which is its first submission, a repeat sign-up, the last time staff saved it, or the last waitlist email it was sent. After replying to an old lead, save it. Only the Owner can enter an earlier date, and nobody a future one. A confirmed newsletter subscriber lapses the same way. A lead whose address has an open privacy request waits until it is closed. A newsletter sign-up nobody confirmed goes after 30 days.
- **Closed privacy requests:** empty means they stay. Once a period is set, each goes that long after it was closed; only the Owner can enter an earlier closing date. Open ones never go. Ask the lawyer for the period before setting it, then replace the policy's "no fixed period" line.
- **Orders and invoices:** off. **Turn this on only once the CA has confirmed the period in writing.** Then each day up to 200 orders go, with their invoices, credit notes and PDFs, once every date on them is older than the period: financial year 2026-27 goes on 1 April 2035 with eight years. Licenses stay and keep working, with no order on them. Invoice numbers are never reused. Replace the policy's "not an automatic job" line when you turn it on.

Deleted records can't be brought back from the admin. Backups keep them for about a year, and a restore brings them back until the next run deletes them again (leads and requests) or they are past the period anyway.

## Analytics (Umami)

Umami has no retention setting, so the `backup` container deletes old visitor data at 03:30 IST: `UMAMI_RETENTION_DAYS` in `/srv/jainav/.env`, empty by default, which keeps everything. The script refuses fewer than 30 days, and Telegram hears. To set it, for example to 13 months:

```bash
cd /srv/jainav
echo 'UMAMI_RETENTION_DAYS=396' >> .env
docker compose -f compose.prod.yml up -d --build backup
docker compose -f compose.prod.yml exec backup prune-umami.sh   # run once now
```

Reports for older dates are then empty, and the policy's "no end date" line for analytics must change. A new Umami version can add a table that holds visitor data: when bumping the image, compare `prisma/schema.prisma` with `docker/backup/prune-umami.sh`. A table Umami drops makes the script fail, and Telegram hears about it.
