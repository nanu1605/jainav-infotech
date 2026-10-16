#!/bin/sh
# Dumps each database in BACKUP_DATABASES, encrypts it to BACKUP_AGE_RECIPIENT (an age public
# key; the private key stays offline with the Owner) and uploads it to the rclone remote
# "backups". Keeps 30 daily and 12 monthly copies. Telegram is told about failures.
set -eu -o pipefail

stamp=$(date -u +%Y-%m-%dT%H%MZ)
tmp=$(mktemp -d)

alert() {
  echo "$1" >&2
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] &&
    curl -fsS -o /dev/null "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$1" || true
}
trap 'status=$?; [ "$status" -ne 0 ] && alert "Backup failed (exit $status) at $stamp"; rm -rf "$tmp"' EXIT

for db in $BACKUP_DATABASES; do
  file="$tmp/$db-$stamp.dump.age"
  pg_dump --format=custom --no-owner --no-privileges --dbname="$db" |
    age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" >"$file"
  # A custom-format dump of even an empty database is a few KB; anything tiny is broken.
  [ "$(wc -c <"$file")" -gt 1024 ] || { echo "dump of $db is too small" >&2; exit 1; }
done

remote="backups:$BACKUP_BUCKET"
# Prefixes are folders on a local remote; on R2 these are no-ops.
rclone mkdir "$remote/daily"
rclone mkdir "$remote/monthly"
rclone copy "$tmp" "$remote/daily/"
[ "$(date -u +%d)" = 01 ] && rclone copy "$tmp" "$remote/monthly/"
rclone delete --min-age 30d "$remote/daily/"
rclone delete --min-age 365d "$remote/monthly/"
echo "backup $stamp done: $(ls "$tmp" | tr '\n' ' ')"
