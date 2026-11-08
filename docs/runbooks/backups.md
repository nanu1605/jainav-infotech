# Backups and restores

The `backup` service (`docker/backup/`) dumps the `jainav` and `umami` databases every night at
02:30 IST. Staging is not backed up. Each dump is:

- made with `pg_dump --format=custom`;
- encrypted with [age](https://age-encryption.org) to a public key;
- uploaded to the R2 bucket `jainav-backups`.

Copies kept: 30 daily (`daily/`) and 12 monthly (`monthly/`, from the 1st of each month).
A failed run sends a Telegram alert, and a success pings the heartbeat (below).

Every compose command on the server goes through `sudo app-compose jainav …`, which runs the
project in `/srv/jainav` with its env files ([server.md §8](server.md#8-one-off-commands)). The
backup containers run as root (uid 0) with no `DAC_OVERRIDE`, so they read only what root owns or
everyone may read. The server builds no image: the backup image comes from CI as `backup-<sha>`
and is installed with `sudo app-deploy jainav backup <tag>` ([server.md §5](server.md#5-deploy)).

## The key

The server only has the **public** key, so a leaked bucket or server can't decrypt old dumps.
The private key stays with the Owner, offline (a password manager plus a printed copy).

```bash
docker run --rm -v "$PWD:/k" postgres:17-alpine sh -c 'apk add -q age && age-keygen -o /k/jainav-backup-key.txt'
grep 'public key' jainav-backup-key.txt     # age1… → BACKUP_AGE_RECIPIENT in /srv/jainav/.env
```

The same public key is `BACKUP_RECIPIENT` in `/etc/apps/jainav.conf`, which encrypts the settings
archive. Store `jainav-backup-key.txt` safely, then delete it from the machine you made it on.
Without it, no backup can ever be restored.

## The settings archive

The dumps hold no settings, so a root timer, `app-config-archive@jainav.timer` (20:50 UTC, ten
minutes before the dump), encrypts them as they are at that moment:

- `CONFIG_ARCHIVE_FILES` in `/etc/apps/jainav.conf` names them: `.env`, `images.env`,
  `production.env`, `staging.env` and `deploys.log`;
- the archive is `/srv/jainav/backup-out/config-<stamp>.tar.age`, the newest 3 are kept, and the
  directory is readable by every user (0755, archives 0644) because it holds only ciphertext;
- the backup container mounts `backup-out` read-only, uploads the newest archive next to the dumps
  and fails, with an alert, when that archive is missing or more than 2 hours old. The secrets
  never enter the long-running container.

The timer is enabled by hand ([server.md §3](server.md#3-first-start)), and `hostwatch` alerts
when it isn't ([monitoring.md](monitoring.md#hostwatch)). Check it:

```bash
systemctl list-timers 'app-config-archive@*'
sudo journalctl -t app-config-archive --since yesterday
ls -l /srv/jainav/backup-out
```

## The heartbeat

`BACKUP_HEARTBEAT_URL` in `/srv/jainav/.env` is the ping URL of a monitor for this job. The job
pings it only after every step worked, so a ping missing for 26 hours means a dead container, a
dead cron or a failed run ([monitoring.md](monitoring.md#uptime-heartbeats-and-status-page)).

## Check last night's backup

```bash
sudo app-compose jainav logs --tail 20 backup
sudo app-compose jainav exec backup rclone lsl backups:jainav-backups/daily/ | tail -4
sudo app-compose jainav exec backup backup.sh     # run one now
```

The listing shows a `jainav-…` dump, an `umami-…` dump and a `config-….tar.age` for the night.

## Bucket locks

In the R2 dashboard, set with an admin token and not the one on the server, the bucket has
retention locks: `daily/` for 29 days and `monthly/` for 364 days. That is just under the job's
own pruning ages (30 and 365 days), so pruning still works, but a compromised server can't delete
the history. The token on the server reaches this bucket only.

## Monthly restore test (spec §18.4)

It restores the newest dumps into a throwaway Postgres (its data lives only in memory), one
database at a time, streamed from the bucket through age into `pg_restore`, so no decrypted copy
touches a disk. It checks the tables, the applied migrations and the site's content, prints each
database's size, and decrypts the newest settings archive to list its file names, never their
contents. Nothing touches the real database. Run it in the first week of the month, never while
`hostwatch` reports the server throttled.

The private key goes on `ramfs`, which is never swapped and disappears at unmount:

```bash
sudo install -d -m 700 /run/age
sudo mount -t ramfs -o mode=700 ramfs /run/age
sudo tee /run/age/identity.txt >/dev/null     # paste the private key, then Ctrl-D
sudo chmod 600 /run/age/identity.txt
sudo app-compose jainav --profile restore-test run --rm -v /run/age:/run/age:ro restore-test
sudo app-compose jainav --profile restore-test rm -sf restore-db
sudo rm /run/age/identity.txt && sudo umount /run/age
```

`app-compose` first checks that the server has the memory for the one-off. The key file must be
owned by root: the container's root can't read another user's file. The run ends with
`restore test passed`. Record the date and result in `docs/decisions.md` (or the ops log) each
month. The last full run was the local rehearsal of 2026-10-24; replace it after the first run
on the server:

- `jainav`: 411 tables, 11 migrations, pages and products present;
- `umami`: 27 tables.

## Restore for real (disaster recovery)

With the private key in `/run/age/identity.txt`, as in the restore test:

```bash
C="sudo app-compose jainav"
$C stop app
# Keep the broken database for inspection; restore into a fresh one owned by the app's role.
$C exec postgres psql -U postgres -c 'ALTER DATABASE jainav RENAME TO jainav_broken' \
  -c 'CREATE DATABASE jainav OWNER jainav'
$C run --rm -v /run/age:/run/age:ro backup sh -c '
  f=$(rclone lsf --files-only backups:$BACKUP_BUCKET/daily/ | grep "^jainav-" | sort | tail -n 1)
  echo "restoring $f"
  rclone cat "backups:$BACKUP_BUCKET/daily/$f" | age --decrypt --identity /run/age/identity.txt |
    pg_restore --no-owner --role=jainav --exit-on-error --dbname=jainav'
$C up -d app
sudo rm /run/age/identity.txt && sudo umount /run/age
```

For an older copy, pick the file from `daily/` or `monthly/` instead of the newest. Then check
`/api/v1/health` and the admin. Media, installers and CVs live in R2, not in the dump. Replacing
the database doesn't touch them.

## Disaster recovery on a new server

Hostinger's own backups are switched off (hPanel → Backups → turn off automatic backups): they
are unencrypted images of the whole VPS, which would hold both apps' databases and env files and
would overwrite both apps on a restore. These encrypted backups are the only way back, so
rehearse this once from R2 alone and time it.

1. Provision the new VPS ([server.md §1](server.md#1-provision-the-vps)), then put the files in
   place ([server.md §2](server.md#2-put-the-files-in-place)).
   - New host keys: update `DEPLOY_KNOWN_HOSTS` in every GitHub environment.
   - New deploy key pairs for the deploy users, and the second admin key.
2. If the old server may still run, stop its `cloudflared`, or refresh the tunnel token in Zero
   Trust, before the new connector starts. Otherwise both are replicas and requests can land on
   the old server.
3. Download the newest settings archive and dumps from the R2 dashboard, or with a new read-only
   token. The R2 keys inside the archive can't fetch the archive itself.
4. Decrypt the settings archive into `/srv/jainav` (files 0600) with the private key.
5. Rebuild the edge ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls) and
   [§5](edge.md#5-adding-an-app)): `edge.env` from the password manager, new Origin CA
   certificates from fresh CSRs for each zone, `aop-ca.pem` from the password manager, and the
   site files through `app-apply`.
6. `sudo app-apply jainav compose`, then `sudo app-compose jainav up -d postgres`. The database
   roles come from `.env` through `postgres/roles.sh`.
7. Restore each dump, streamed as above, into a fresh database owned by its role: `jainav` with
   `pg_restore --no-owner --role=jainav --dbname=jainav` and `umami` with
   `pg_restore --no-owner --role=umami --dbname=umami` (create the `umami` database
   `OWNER umami` first).
8. Deploy the images listed in `images.env`, and the backup image, with the admin form
   ([server.md §5](server.md#5-deploy)).
9. Point the proxied A records at the new IP, attach the firewall group, and run the leak test
   ([edge.md §6](edge.md#6-the-leak-test)).

The other app on the server has its own job, bucket, token, age key pair, bot and heartbeat, and
recovers from its own archive the same way. Each private key stays offline with the Owner.
