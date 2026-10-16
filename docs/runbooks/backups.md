# Backups and restores

The `backup` service (`docker/backup/`) dumps the `jainav` and `umami` databases every night at
02:30 IST. Staging is not backed up. Each dump is:

- made with `pg_dump --format=custom`;
- encrypted with [age](https://age-encryption.org) to a public key;
- uploaded to the R2 bucket `jainav-backups`.

Copies kept: 30 daily (`daily/`) and 12 monthly (`monthly/`, from the 1st of each month).
A failed run sends a Telegram alert.

## The key

The server only has the **public** key, so a leaked bucket or server can't decrypt old dumps.
The private key stays with the Owner, offline (a password manager plus a printed copy).

```bash
docker run --rm -v "$PWD:/k" postgres:17-alpine sh -c 'apk add -q age && age-keygen -o /k/jainav-backup-key.txt'
grep 'public key' jainav-backup-key.txt     # age1… → BACKUP_AGE_RECIPIENT in /srv/jainav/.env
```

Store `jainav-backup-key.txt` safely, then delete it from the machine you made it on. Without
it, no backup can ever be restored.

## Check last night's backup

```bash
cd /srv/jainav
docker compose -f compose.prod.yml logs --tail 20 backup
docker compose -f compose.prod.yml exec backup rclone lsl backups:jainav-backups/daily/ | tail -4
docker compose -f compose.prod.yml exec backup backup.sh     # run one now
```

## Monthly restore test (spec §18.4)

It restores the newest dumps into a throwaway Postgres (its data lives only in memory), then
checks the tables, the applied migrations and the site's content. Nothing touches the real
database.

```bash
cd /srv/jainav
mkdir -p /tmp/age && chmod 700 /tmp/age
cat > /tmp/age/identity.txt        # paste the private key, then Ctrl-D
docker compose -f compose.prod.yml --profile restore-test run --rm \
  -v /tmp/age:/run/age:ro restore-test
docker compose -f compose.prod.yml --profile restore-test rm -sf restore-db
shred -u /tmp/age/identity.txt
```

It ends with `restore test passed`. Record the date and result in `docs/decisions.md` (or the
ops log) each month. The first full run was the local rehearsal of 2026-10-16:

- `jainav`: 388 tables, 6 migrations, pages, products and users present;
- `umami`: 27 tables.

## Restore for real (disaster recovery)

With the private key in `/tmp/age/identity.txt`, as in the restore test:

```bash
cd /srv/jainav
C="docker compose -f compose.prod.yml"
$C stop app
# Keep the broken database for inspection; restore into a fresh one owned by the app's role.
$C exec postgres psql -U postgres -c 'ALTER DATABASE jainav RENAME TO jainav_broken' \
  -c 'CREATE DATABASE jainav OWNER jainav'
$C run --rm -v /tmp/age:/run/age:ro backup sh -c '
  f=$(rclone lsf --files-only backups:$BACKUP_BUCKET/daily/ | grep "^jainav-" | sort | tail -n 1)
  echo "restoring $f"
  rclone cat "backups:$BACKUP_BUCKET/daily/$f" | age --decrypt --identity /run/age/identity.txt |
    pg_restore --no-owner --role=jainav --exit-on-error --dbname=jainav'
$C up -d app
shred -u /tmp/age/identity.txt
```

For an older copy, pick the file from `daily/` or `monthly/` instead of the newest. Then check
`/api/v1/health` and the admin. Media, installers and CVs live in R2, not in the dump. Replacing
the database doesn't touch them.
