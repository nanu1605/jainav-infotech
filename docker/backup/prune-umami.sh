#!/bin/sh
# Deletes Umami's visitor data older than UMAMI_RETENTION_DAYS (empty = keep it). Umami has no
# retention setting of its own. Tables as of Umami 3.4: a new one holding visitor data needs a line
# here, and a dropped one fails this script, which Telegram is told about.
set -eu -o pipefail

days=${UMAMI_RETENTION_DAYS:-}
[ -n "$days" ] || exit 0

alert() {
  echo "$1" >&2
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] &&
    curl -fsS -o /dev/null "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$1" || true
}
trap 'status=$?; [ "$status" -ne 0 ] && alert "Umami retention failed (exit $status)"' EXIT

case "$days" in
  *[!0-9]*) echo "UMAMI_RETENTION_DAYS must be a whole number of days" >&2; exit 1 ;;
esac
# A typo must not wipe the reports.
[ "$days" -ge 30 ] || { echo "UMAMI_RETENTION_DAYS must be at least 30" >&2; exit 1; }

psql --dbname="${UMAMI_DATABASE:-umami}" -v ON_ERROR_STOP=1 -v days="$days" <<'SQL'
BEGIN;
DELETE FROM event_data WHERE created_at < now() - make_interval(days => :days);
DELETE FROM website_event WHERE created_at < now() - make_interval(days => :days);
DELETE FROM session_data WHERE created_at < now() - make_interval(days => :days);
DELETE FROM revenue WHERE created_at < now() - make_interval(days => :days);
DELETE FROM session_link WHERE created_at < now() - make_interval(days => :days);
DELETE FROM heatmap_event WHERE created_at < now() - make_interval(days => :days);
DELETE FROM session_replay WHERE created_at < now() - make_interval(days => :days);
DELETE FROM session_replay_saved WHERE created_at < now() - make_interval(days => :days);
-- A session is deleted only once no event is left: a returning visitor's row is reused.
DELETE FROM session s
WHERE s.created_at < now() - make_interval(days => :days)
  AND NOT EXISTS (SELECT 1 FROM website_event e WHERE e.session_id = s.session_id);
COMMIT;
SQL
echo "umami retention: older than $days days removed"
