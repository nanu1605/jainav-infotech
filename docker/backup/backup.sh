#!/bin/sh
# shellcheck disable=SC3040
# (busybox ash, this image's sh, has pipefail)
# Dumps each database in BACKUP_DATABASES, encrypts it to BACKUP_AGE_RECIPIENT (an age public
# key; the private key stays offline with the Owner) and uploads it, with the newest settings
# archive from /config-out, to the rclone remote "backups". Keeps 30 daily and 12 monthly copies.
# Telegram is told about failures; HEARTBEAT_URL is pinged only after a full success, so a silent
# monitor means this job didn't run or didn't finish.
set -eu -o pipefail

stamp=$(date -u +%Y-%m-%dT%H%MZ)
tmp=$(mktemp -d)
reason=

alert() {
  msg="[jainav] $1"
  echo "$msg" >&2
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -fsS -o /dev/null "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$msg" || true
  fi
}
fail() { reason=$1; exit 1; }
finish() {
  status=$?
  rm -rf "$tmp"
  if [ "$status" -ne 0 ]; then alert "Backup failed (exit $status) at $stamp${reason:+: $reason}"; fi
}
trap finish EXIT

for db in $BACKUP_DATABASES; do
  file="$tmp/$db-$stamp.dump.age"
  pg_dump --format=custom --no-owner --no-privileges --dbname="$db" |
    age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" >"$file"
  # A custom-format dump of even an empty database is a few KB; anything tiny is broken.
  [ "$(wc -c <"$file")" -gt 1024 ] || fail "dump of $db is too small"
done

# The settings archive: the host's timer (app-config-archive) encrypts the server's settings files
# as they are then into /config-out, which this container only sees read-only and as ciphertext.
# The newest name sorts last. One older than 2 hours means the timer stopped; it is not uploaded,
# and the job fails once the dumps are safe.
archive=
archive_problem=
for f in /config-out/config-*.tar.age; do
  if [ -e "$f" ]; then archive=$f; fi
done
if [ -z "$archive" ]; then
  archive_problem="no settings archive in /config-out"
elif [ -n "$(find "$archive" -mmin +120)" ]; then
  archive_problem="the settings archive ${archive##*/} is more than 2 hours old"
elif [ "$(wc -c <"$archive")" -le 1024 ]; then
  archive_problem="the settings archive ${archive##*/} is too small"
else
  cp "$archive" "$tmp/"
fi

remote="backups:$BACKUP_BUCKET"
# Prefixes are folders on a local remote; on R2 these are no-ops.
rclone mkdir "$remote/daily"
rclone mkdir "$remote/monthly"
rclone copy "$tmp" "$remote/daily/"
[ "$(date -u +%d)" = 01 ] && rclone copy "$tmp" "$remote/monthly/"
rclone delete --min-age 30d "$remote/daily/"
rclone delete --min-age 365d "$remote/monthly/"
[ -z "$archive_problem" ] || fail "$archive_problem"

uploaded=
for f in "$tmp"/*; do uploaded="$uploaded ${f##*/}"; done
echo "backup $stamp done:$uploaded"
# Last, so that a ping means every step above worked. A failed ping is only reported: the monitor
# notices the missing one.
if [ -n "${HEARTBEAT_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 -o /dev/null "$HEARTBEAT_URL" || echo "heartbeat ping failed" >&2
fi
