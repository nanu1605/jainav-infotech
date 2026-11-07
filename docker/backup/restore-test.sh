#!/bin/sh
# shellcheck disable=SC3040
# (busybox ash, this image's sh, has pipefail)
# Restores the newest daily dump of each database in BACKUP_DATABASES into the Postgres server at
# PGHOST (a throwaway one: the restore-db service) and checks that the data is really there. Each
# dump streams from the bucket through age into pg_restore, so no decrypted copy touches a disk, and
# the databases go one at a time. It also decrypts the newest settings archive to list the names of
# its files (never their contents). Needs the age private key at AGE_IDENTITY_FILE.
# Exit 0 = the backups can be restored.
set -eu -o pipefail

remote="backups:$BACKUP_BUCKET/daily"
site=${SITE_DATABASE:-jainav}

# The newest object whose name matches the pattern ($1); the stamps in the names sort by time.
# No match is not an error here (the caller explains it); a failing rclone still is.
newest() {
  rclone lsf --files-only "$remote/" | { grep "$1" || true; } | sort | tail -n 1
}

for db in $BACKUP_DATABASES; do
  name=$(newest "^$db-.*\.dump\.age\$")
  [ -n "$name" ] || { echo "no backup of $db in $remote" >&2; exit 1; }
  createdb "$db"
  # pipefail: a failing rclone or age fails the restore, not only pg_restore.
  rclone cat "$remote/$name" | age --decrypt --identity "$AGE_IDENTITY_FILE" |
    pg_restore --no-owner --no-privileges --exit-on-error --dbname="$db"
  tables=$(psql -tA --dbname="$db" -c "select count(*) from pg_tables where schemaname = 'public'")
  [ "$tables" -gt 0 ] || { echo "$db restored with no tables" >&2; exit 1; }
  size=$(psql -tA --dbname="$db" -c "select pg_size_pretty(pg_database_size(current_database()))")
  echo "$db: restored $name ($tables tables, $size)"
done

# The site's own data: applied migrations and the content people see.
psql -tA --dbname="$site" -v ON_ERROR_STOP=1 -c "
  select 'migrations ' || count(*) from payload_migrations
  union all select 'pages ' || count(*) from pages
  union all select 'products ' || count(*) from products
  union all select 'users ' || count(*) from users"
[ "$(psql -tA --dbname="$site" -c 'select count(*) from payload_migrations')" -gt 0 ]

# The settings archive holds every secret of the server. The listing shows that it decrypts and
# which files it holds, and nothing else.
archive=$(newest '^config-.*\.tar\.age$')
[ -n "$archive" ] || { echo "no settings archive in $remote" >&2; exit 1; }
files=$(rclone cat "$remote/$archive" | age --decrypt --identity "$AGE_IDENTITY_FILE" | tar -t)
[ -n "$files" ] || { echo "the settings archive $archive is empty" >&2; exit 1; }
echo "settings archive $archive holds: $(echo "$files" | tr '\n' ' ')"
echo "restore test passed"
