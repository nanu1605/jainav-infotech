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
The private key stays with the Owner, offline (a password manager plus a printed copy). Make it
on your own machine, never on the server:

```bash
docker run --rm -v "$PWD:/k" postgres:17-alpine sh -c 'apk add -q age && age-keygen -o /k/jainav-backup-key.txt'
grep 'public key' jainav-backup-key.txt     # age1… → BACKUP_AGE_RECIPIENT in /srv/jainav/.env
```

The same public key is `BACKUP_RECIPIENT` in `/etc/apps/jainav.conf`, which encrypts the settings
archive. Without the private key, no backup can ever be restored.

Store the whole file in the password manager and print it. Then check the stored copy before the
file goes: a copy that was never checked can be another key, and nothing shows it until a restore
fails. Copy the entry in the password manager, but only while Windows' _Clipboard history across
your devices_ (Settings → System → Clipboard) is off: it uploads what you copy. Then, in Git Bash
in the folder with the file, run the `read` line on its own, paste at its prompt (which shows
nothing) and press Ctrl-D, then run the rest. The `read` takes everything pasted until Ctrl-D, so
pasting the whole block at once would swallow the other lines.

```bash
IFS= read -rsd $'\004' -p 'Paste the stored key, then Ctrl-D: ' K; echo
pub=$(printf '%s\n' "$K" | grep -o 'AGE-SECRET-KEY-1[0-9A-Z]*' |
  docker run --rm -i postgres:17-alpine sh -c 'apk add -q age >/dev/null </dev/null && age-keygen -y'); unset K
if [ -z "$pub" ]; then echo 'no key read: see the error above'
elif [ ! -f jainav-backup-key.txt ]; then echo 'run this in the folder with jainav-backup-key.txt'
elif tr -d '\r' <jainav-backup-key.txt | grep -qxF "# public key: $pub"; then echo 'same key'
else echo 'DIFFERENT'; fi
clip </dev/null    # empties the clipboard; with clipboard history on, also Win+V, Clear all
```

Only after `same key`, delete `jainav-backup-key.txt` from the machine you made it on. To check a
stored copy once the file is gone, run the first three lines (up to `unset K`), then
`echo "$pub"`: the `age1…` key it prints must be the same as `BACKUP_RECIPIENT` on the server
(`grep '^BACKUP_RECIPIENT=' /etc/apps/jainav.conf`).

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

The timer is enabled by hand ([server.md §3](server.md#3-first-start)), after
`/etc/hostwatch.env` is filled and the backup image is deployed, so that its alerts reach the chat
and `deploys.log` exists. `hostwatch` alerts when it isn't enabled
([monitoring.md](monitoring.md#hostwatch)). Another app gets its own timer,
`app-config-archive@<app>.timer`. If its backup runs at another time, a drop-in moves the timer to
ten minutes before it (`sudo systemctl edit app-config-archive@<app>.timer`; the comment in
`docker/host/systemd/app-config-archive@.timer` has the lines). Check it:

```bash
systemctl list-timers 'app-config-archive@*'
sudo journalctl -t app-config-archive --since yesterday
sudo ls -l /srv/jainav/backup-out
```

## The heartbeat

`BACKUP_HEARTBEAT_URL` in `/srv/jainav/.env` is the ping URL of a monitor for this job. The job
pings it only after every step worked, so a ping missing for 26 hours means a dead container, a
dead cron or a failed run ([monitoring.md](monitoring.md#uptime-heartbeats-and-status-page)).

## Check last night's backup

```bash
sudo app-compose jainav logs --tail 20 backup
sudo app-compose jainav exec backup rclone lsl backups:jainav-backups/daily/ | tail -4
```

The listing shows a `jainav-…` dump, an `umami-…` dump and a `config-….tar.age` for the night.

To run one now, make a fresh settings archive first. The job fails, with an alert, when the
newest archive is more than 2 hours old, and the timer makes one only at 20:50 UTC:

```bash
sudo systemctl start app-config-archive@jainav.service
sudo app-compose jainav exec backup backup.sh
```

The run adds a set of its own next to the night's; nothing is overwritten.

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

The private key goes on `ramfs`, which is never swapped and disappears at unmount. Copy it from
the password manager as in [The key](#the-key). Run the lines one at a time: the `read` line takes
everything pasted until Ctrl-D. After the paste, empty the clipboard on your own machine
(`clip </dev/null` in Git Bash; with clipboard history on, also Win+V, _Clear all_):

```bash
sudo install -d -m 700 /run/age
sudo mount -t ramfs -o mode=700 ramfs /run/age
IFS= read -rsd $'\004' -p 'Paste the private key, then Ctrl-D: ' K; echo    # shows nothing
printf '%s\n' "$K" | grep -o 'AGE-SECRET-KEY-1[0-9A-Z]*' | sudo tee /run/age/identity.txt >/dev/null; unset K
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
- `umami`: 27 tables (Umami 3.4). Umami 3.5 adds three: the server's run of 2026-11-26 restored 30.

Until the first production deploy, `jainav` has no tables, so the full test fails there. To test
the key and the dumps before then, use this run line instead. It restores `umami`, then stops at
the site check (`database "jainav" does not exist`): that stop is expected. Only a full run
decrypts the settings archive.

```bash
sudo app-compose jainav --profile restore-test run --rm -v /run/age:/run/age:ro -e BACKUP_DATABASES=umami restore-test
```

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
   certificates from fresh CSRs for each zone, each installed with the zone's `aop-ca.pem` as
   the fourth argument and its `aop-client.pem` beside it (Jainav's from the password manager,
   another app's from its owner), then the site files through `app-apply`. Cloudflare keeps
   presenting each zone's client certificate: nothing changes there.
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
