#!/bin/sh
# Restores the newest daily dump of each database in BACKUP_DATABASES into the Postgres server
# at PGHOST (a throwaway one: the restore-db service) and checks that the data is really there.
# Needs the age private key at AGE_IDENTITY_FILE. Exit 0 = the backups can be restored.
set -eu -o pipefail

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
remote="backups:$BACKUP_BUCKET/daily"
site=${SITE_DATABASE:-jainav}

for db in $BACKUP_DATABASES; do
  # No match is not an error here (the next line explains it); a failing rclone still is.
  name=$(rclone lsf --files-only "$remote/" | { grep "^$db-.*\.dump\.age\$" || true; } | sort | tail -n 1)
  [ -n "$name" ] || { echo "no backup of $db in $remote" >&2; exit 1; }
  rclone copyto "$remote/$name" "$tmp/$name"
  age --decrypt --identity "$AGE_IDENTITY_FILE" "$tmp/$name" >"$tmp/$db.dump"

  createdb "$db"
  pg_restore --no-owner --no-privileges --exit-on-error --dbname="$db" "$tmp/$db.dump"
  tables=$(psql -tA --dbname="$db" -c "select count(*) from pg_tables where schemaname = 'public'")
  [ "$tables" -gt 0 ] || { echo "$db restored with no tables" >&2; exit 1; }
  echo "$db: restored $name ($tables tables)"
done

# The site's own data: applied migrations and the content people see.
psql -tA --dbname="$site" -v ON_ERROR_STOP=1 -c "
  select 'migrations ' || count(*) from payload_migrations
  union all select 'pages ' || count(*) from pages
  union all select 'products ' || count(*) from products
  union all select 'users ' || count(*) from users"
[ "$(psql -tA --dbname="$site" -c 'select count(*) from payload_migrations')" -gt 0 ]
echo "restore test passed"
