# Server: set up, deploy, roll back

One VPS (Hostinger KVM 4, Ubuntu 24.04, 16 GB) is shared with a second private app, MenuMesh.
Jainav runs in `/srv/jainav`: the production and staging apps, one Postgres server (databases
`jainav`, `jainav_staging`, `umami`), Umami and the backup job. One Caddy, the edge project in
`/srv/edge`, serves every app and accepts connections only from Cloudflare
([edge.md](edge.md)). The definitions are in `docker/` in this repository; the scripts root runs
are in `docker/host/`.

Cloudflare sits in front ([cloudflare.md](cloudflare.md)). Backups: [backups.md](backups.md).
Monitoring: [monitoring.md](monitoring.md). The order of everything for Launch 1:
[launch.md](launch.md).

Who does what on the server:

- `ops`: the admin account. Key login, sudo asks for its password. Everything below is run as `ops`
  with `sudo`, through the SSH tunnel.
- `deploy-jainav`: the account of Jainav's GitHub deploys. Its keys can run one command,
  `app-deploy`, and nothing else. No account is in the `docker` group, because that group is
  root.
- `root`: no SSH login once the server is hardened (§1, §9).

## 1. Provision the VPS

Do these in order. Keep the root session open until the end of step 14.

1. **Buy:** Hostinger KVM 4 for 24 months, location Mumbai 2 (not the cart's default), plain
   Ubuntu 24.04 with your public key, a strong root password saved in the password manager, and
   two-factor sign-in on the Hostinger account. Once the VPS exists, turn off its automatic
   backups in hPanel, and leave its Malware Scanner off (step 4). The server's IP address goes
   only into hPanel and Cloudflare.
2. **Firewall in hPanel, before anything else.** Docker publishes container ports through its own
   iptables rules, which bypass ufw, so the provider's network firewall is the first layer
   (`cf-ranges` on the host is the second, [edge.md §4](edge.md#4-cloudflares-ranges-and-the-origin-firewall)).
   Create a firewall group, attach it to the VPS and add:
   - TCP 443 from each of Cloudflare's IPv4 ranges: <https://www.cloudflare.com/ips-v4> (note any
     limit on the number of rules);
   - TCP 22 from your own IPv4 address, until step 14;
   - nothing else: everything else is dropped, and port 80 stays closed.
3. **Look around** as root (`ssh root@<ip>`): `uname -m` (x86_64), `free -m`, `ip route show
default` (the public interface), `ls /etc/ssh/sshd_config.d/`, `timedatectl` (clock
   synchronised), `ssh-keygen -lf /root/.ssh/authorized_keys` (which keys are there). Next to
   yours, hPanel keeps an RSA key there for its own tools, marked `#hostinger-managed-key` and
   given an `expiry-time`. Leave it: root's SSH login ends at step 14.
4. **Hostinger's extras, then updates and tools.** Hostinger's Ubuntu 24.04 image adds three
   things to plain Ubuntu:
   - the Monarx agent, Hostinger's malware scanner for PHP sites. It runs as root, can upload
     files to its vendor, and comes with its own apt source, a signing key trusted for every
     source and a cron job that reinstalls it every week;
   - cron jobs that prune Docker: every night `docker image prune -af --filter until=24h`, which
     would delete the previous image and the tools images that `app-deploy` keeps for rollbacks
     and one-off commands (§5, §8), and every week a prune of the build cache;
   - Docker itself (step 5).

   Remove the first two. hPanel's Malware Scanner installs the agent again, so leave it off:

   ```bash
   systemctl disable --now monarx-agent
   apt-get -y purge monarx-agent monarx-protect monarx-protect-autodetect
   rm -f /etc/apt/sources.list.d/monarx.list /etc/apt/trusted.gpg.d/monarx.asc \
     /etc/cron.d/monarx-update /etc/monarx-agent.conf \
     /etc/cron.d/docker-image-prune /etc/cron.d/docker-builder-prune \
     /etc/systemd/system/multi-user.target.wants/monarx-agent.service \
     /var/lib/systemd/deb-systemd-helper-enabled/*monarx* \
     /var/lib/systemd/deb-systemd-helper-enabled/*/*monarx*
   rm -rf /var/cache/monarx-agent /var/lib/monarx-agent /var/log/monarx-agent.log
   systemctl daemon-reload
   apt-get update                   # also drops the package lists of the Monarx source
   find / -xdev -iname '*monarx*'   # prints nothing once it is all gone; remove what it lists
   ```

   Where Monarx is already gone, the first two commands say that the unit or the package doesn't
   exist; carry on. A reinstall from hPanel brings all of it back, and `install.sh` warns while
   any of it is there (step 8).

   Hold the image's Docker packages before upgrading, so the upgrade doesn't move them past the
   pinned versions (step 5). `jq` and `age` are needed by the host scripts; `install.sh` stops
   without them:

   ```bash
   apt-mark hold docker-ce docker-ce-cli containerd.io docker-compose-plugin
   apt-get update && apt-get -y full-upgrade
   apt-get -y install unattended-upgrades jq age curl openssl
   dpkg-reconfigure -f noninteractive unattended-upgrades   # security updates, no automatic reboot
   ```

   Add a 4 GiB swap file (`fallocate -l 4G /swapfile`, `chmod 600`, `mkswap`, `swapon`, and a line
   in `/etc/fstab`). Reboot if the kernel changed.

5. **Docker** from Docker's apt repository (docs.docker.com/engine/install/ubuntu), at pinned
   versions, then held: Docker 29.9.3 and Compose 5.7.0, or a later 29.x and 5.x release once it
   is 14 days old. List them with `apt-cache madison docker-ce docker-compose-plugin`:

   ```bash
   apt-get install -y docker-ce=<version> docker-ce-cli=<version> containerd.io \
     docker-compose-plugin=<version>        # no buildx
   apt-mark hold docker-ce docker-ce-cli containerd.io docker-compose-plugin
   ```

   Hostinger's image already has Docker from Docker's repository, held since step 4. Compare its
   versions with the ones above (`dpkg -l | grep -E 'docker|containerd'`). Keep them if they are
   the pinned ones, or a later 29.x and 5.x release that is 14 days old. Otherwise run
   `apt-mark unhold` on the four packages, install the pinned versions as above (adding
   `--allow-downgrades` if the image's are newer) and hold them again. Then remove the two extras
   the image adds (nothing builds images here):
   `apt-get -y purge docker-buildx-plugin docker-ce-rootless-extras`.

   Do not add anyone to the `docker` group. `install.sh` warns if one of the four packages is not
   held, either extra is installed or the group has members. Docker's own settings come from the
   kit in step 8: `install.sh` replaces the image's `/etc/docker/daemon.json` and keeps it as
   `daemon.json.bak`.

6. **Deploy keys, on your machine.** One key pair per environment, made only for deploys:

   ```bash
   ssh-keygen -t ed25519 -f gha-jainav-staging -N '' -C gha-jainav-staging
   ssh-keygen -t ed25519 -f gha-jainav-production -N '' -C gha-jainav-production
   ```

   The private halves go to GitHub (§4). Keep the public halves as `gha-jainav-staging.pub` and
   `gha-jainav-production.pub`: the file name is `gha-<app>-<environment>.pub` and decides which
   environment the key may deploy.

7. **The kit.** Copy `docker/host`, `docker/edge` and the public keys to `/root/kit` on the
   server (`host/`, `edge/`, `keys/`), for example with `scp -r`. Admin keys go in `keys/` as
   `ops-<name>.pub`, or are already in root's `authorized_keys`.
8. **Install the host settings.** Pass the fingerprint of your admin key (the SHA256 line of
   `ssh-keygen -lf`) and your own IPv4 address, the one in the hPanel rule:

   ```bash
   bash /root/kit/host/install.sh --admin-key-fpr SHA256:<fingerprint> --bootstrap-ssh-from <your IPv4>
   ```

   It creates `ops` and the deploy users, installs the scripts, sudoers, `daemon.json`, journald
   and sysctl settings and the units, loads the origin firewall before Docker and restarts Docker,
   installs the deploy keys and `/etc/apps/*.conf`, and prints what is left to do, including the
   exact command to enable each timer. It also warns about anything from steps 4 and 5 that is
   still there. It is safe to run again. Then set a password for `ops` (sudo asks for it):

   ```bash
   passwd ops
   ```

   Check that the journal limit shows: `journalctl -u systemd-journald -n 3 -o cat` reports
   `max 24.0G`. A log line stays 180 to 187 days, which the privacy policy states
   ([decisions.md](../decisions.md)).

9. **cloudflared and the SSH tunnel.** Install `cloudflared` from the same release and checksum
   that `.github/workflows/deploy.yml` pins. The order is: the tunnel and the Access application
   first, the connector here, the route last, then the outside check
   ([cloudflare.md](cloudflare.md#ssh-tunnel)). Install the service once, from the root session,
   with this one line; `read` then waits for the token, so paste it at the prompt. It stays off
   the screen and out of the shell history, and `${T##* }` keeps only the last word, so the bare
   token and the whole copied command both work:

   ```bash
   read -rsp 'Token or copied command: ' T; echo; cloudflared service install --no-update-service "${T##* }"; unset T
   ```

   `--no-update-service` goes before the token. Without it, cloudflared also installs an update
   service and a daily timer that replace the binary with Cloudflare's latest release; the kit
   pins the release and updates are made by hand. Check the result (never print the token file):

   ```bash
   systemctl cat cloudflared | grep ExecStart    # … tunnel run --token-file /etc/cloudflared/token
   stat -c '%a %U %s' /etc/cloudflared/token     # 600 root, and a size above 0
   systemctl list-unit-files 'cloudflared*'      # cloudflared.service only
   systemctl restart cloudflared                 # applies the kit's drop-in, proves the file works
   curl -s http://127.0.0.1:20241/metrics | grep '^cloudflared_tunnel_ha_connections'   # 1 or more
   ```

   If `cloudflared-update.timer` is listed, run `systemctl disable --now cloudflared-update.timer`.
   Never run `service install` a second time: it fails and its cleanup deletes the token file. The
   running connector keeps its connections, so nothing looks wrong, but the next restart or reboot
   fails, and after hardening that means no SSH. To restore the file, run this one line and paste
   the token at its prompt:

   ```bash
   read -rsp 'Token or copied command: ' T; echo; T=${T##* }; (umask 077; printf '%s' "$T" > /etc/cloudflared/token); unset T; systemctl restart cloudflared && echo restarted
   ```

   The kit's drop-in `10-kit.conf` limits its memory and opens the metrics on loopback only;
   `install.sh` puts it in place whether or not `cloudflared` is installed yet, and the restart
   above applies it. Once the route exists, `journalctl -u cloudflared` shows "Updated to new
   configuration" with the ssh hostname and `ssh://localhost:22`.

10. **Your SSH config** (`~/.ssh/config`), for the commands below:

    ```
    Host jainav
      HostName ssh.jainavinfotech.in
      User ops
      IdentityFile ~/.ssh/<your admin key>
      IdentitiesOnly yes
      ProxyCommand cloudflared access ssh --hostname %h
    ```

    `IdentityFile` is needed when the admin key's file has a non-default name. On Windows,
    `winget install --id Cloudflare.cloudflared --exact --version <the release deploy.yml pins>`
    installs `cloudflared` machine-wide and adds it to the PATH: open a new terminal afterwards, or
    give the full path in double quotes,
    `ProxyCommand "C:\Program Files (x86)\cloudflared\cloudflared.exe" access ssh --hostname %h`.
    Both forms work with Windows' own ssh and with Git Bash's; an unquoted 8.3 short path does not
    (Git Bash drops its backslashes).

    Trust the server's host keys before the first login instead of answering a prompt. In the root
    session, print known_hosts lines and append them to `~/.ssh/known_hosts` on your machine:

    ```bash
    awk '{ print "ssh.jainavinfotech.in", $1, $2 }' /etc/ssh/ssh_host_*_key.pub
    ```

    Then the first `ssh jainav` asks nothing. A trust prompt or a changed-key warning means: stop.

11. **Log in through the tunnel**, from a new terminal on your machine: `ssh jainav`. The first
    login opens the browser on the Access login (a one-time PIN sent to your email); `cloudflared`
    keeps the token in `~/.cloudflared/`, so later logins within the session don't ask. sshd logs
    the login as `Accepted publickey for ops from ::1` (or `127.0.0.1`), which
    `install.sh --harden` looks for. Then run `sudo -v`: it asks for the password of `ops` and
    prints nothing on success.

    Check the deploy keys too. They need no shell and must refuse anything but their request; from
    your machine they go through Access with your own login (CI uses the service token):

    ```bash
    printf 'v1 ping\n' | ssh -T -o IdentitiesOnly=yes -i gha-jainav-staging \
      -o ProxyCommand='cloudflared access ssh --hostname %h' deploy-jainav@ssh.jainavinfotech.in
    # expect: pong jainav staging
    ```

    With `gha-jainav-production` it answers `pong jainav production`; any other request gets
    `app-deploy: bad request` and exit status 2.

12. **A second admin key.** Protect the first key with a passphrase (`ssh-keygen -p -f <key>`) and
    add a second key from another device to `ops` (`/home/ops/.ssh/authorized_keys`).
13. **Web Console login.** In hPanel open the VPS's Web Console and log in as `root` with the
    password. It is a serial console and does not depend on sshd, so it is the way back in if the
    tunnel breaks ([§9](#9-break-glass)). Check it works before hardening.
14. **Harden last,** from the root session, once the tunnel and the Web Console both work:

    ```bash
    bash /root/kit/host/install.sh --harden
    ```

    It refuses unless `cloudflared` is enabled, running with a connection to Cloudflare, and has
    the token file its unit reads (present, not empty); `ops` has a key and a password; and
    `sshd -t` passes. It warns when `ops` has fewer than two keys or this boot shows no login by
    `ops` through the tunnel. It turns off root login and passwords and moves sshd from
    `ssh.socket` to `ssh.service`, on loopback only: it first stops every sshd still listening on
    port 22, then checks that the new one answers. Only then does it remove the host firewall's
    allowance for your IP address. If sshd does not come up that way, it puts sshd back as it was,
    keeps the allowance and says so; keep the root session open and read `journalctl -u ssh -n 30`.
    Then:
    - `ss -tlnp | grep ':22 '` shows only `127.0.0.1` and `[::1]`;
    - open a fresh `ssh jainav` and run `sudo -v`, and only then close the root session;
    - delete the TCP 22 rule in hPanel; from outside, `nc -vz -w 5 <ip> 22` must time out.

    Root login is turned off only after Docker and `cloudflared` work, so a mistake earlier costs
    nothing. Restarts of sshd are chained with `&&` behind `sshd -t`; do the same by hand:
    `sshd -t && systemctl reload ssh`.

15. **Timers, by hand.** They stay off until `/etc/hostwatch.env` and the backup settings are
    filled in ([monitoring.md](monitoring.md), [backups.md](backups.md)). `install.sh` prints the
    exact commands; they are of this form:

    ```bash
    sudo systemctl enable --now hostwatch.timer hostwatch-daily.timer cf-ranges-check.timer
    sudo systemctl enable --now app-config-archive@jainav.timer
    ```

    `hostwatch daily` alerts when one of them is not enabled.

## 2. Put the files in place

Everything root runs lives in `/usr/local/sbin` (installed by `install.sh`) and reads its settings
from `/etc/apps/<name>.conf` (`root:root 0644`). Every file that root or a container reads goes
through `app-apply`, which checks it first, copies it (never moves it) and keeps the file it
replaces. Copy files to `/home/ops/incoming` and name them in the command.

| Path                                                | Owner and mode | Put there by                                                                                   |
| --------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `/etc/apps/jainav.conf`, `edge.conf`                | root, 0644     | `install.sh` once; fill `BACKUP_RECIPIENT`                                                     |
| `/srv/jainav`                                       | root, 0750     | `install.sh`                                                                                   |
| `/srv/jainav/compose.prod.yml`                      | root, 0644     | `app-apply jainav compose <file>`                                                              |
| `/srv/jainav/postgres/roles.sh`                     | root, 0755     | `sudo install` by hand, from `docker/postgres/`                                                |
| `/srv/jainav/.env`, `production.env`, `staging.env` | root, 0600     | `sudo install -m 600` by hand (below)                                                          |
| `/srv/jainav/images.env`                            | root, 0644     | by hand once (below); then only `app-deploy` writes it                                         |
| `/srv/jainav/backup-out`                            | root, 0755     | `app-apply jainav compose` creates it                                                          |
| `/srv/edge/edge.env`                                | root, 0600     | `install.sh` copies the example once, filled with `sudoedit`; then `app-apply edge env <file>` |
| `/srv/edge/config/Caddyfile`, `snippets.caddy`      | root, 0644     | the first ones from `install.sh`; then `app-apply edge config <file>`                          |
| `/srv/edge/config/sites/jainav.caddy`               | root, 0644     | `app-apply jainav site <file>`                                                                 |
| `/srv/edge/config/log-redact.d/<app>.caddy`         | root, 0644     | `app-apply edge redact <app> <file>` ([edge.md §7](edge.md#7-log-redaction-for-other-apps))    |
| `/srv/edge/certs/<app>/`                            | root, key 0600 | `app-apply edge cert <app> <origin.pem> <origin-key.pem> [<aop-ca.pem>]`                       |
| `/srv/edge/config/cloudflare-ranges.caddy`          | root, 0644     | `cf-ranges apply`, which goes through `app-apply edge ranges`                                  |
| `/srv/edge/compose.yml`                             | root, 0644     | `app-apply edge compose <file>`                                                                |

Locks are in `/run/app-locks` (root, 0700). The scripts create it and refuse to run if it has
another owner or can be written by others.

**The edge** (details: [edge.md](edge.md)). Order matters:

1. `edge.env`: `install.sh` put a copy of `docker/edge/edge.env.example` at `/srv/edge/edge.env`
   (0600). Fill it in place, once, with `sudoedit /srv/edge/edge.env` (the staging basic-auth hash
   comes from `sudo docker run --rm -it caddy:<tag in docker/edge/compose.yml> caddy hash-password`):
   every `app-apply edge` command reads it, and the example's placeholders don't pass. Later
   changes go through `sudo app-apply edge env <file>` and a recreate.
2. `install.sh` also put the first `Caddyfile` and `snippets.caddy` into `/srv/edge/config/`,
   because every `app-apply edge` command validates the whole tree and a tree without them can't
   pass. Then `sudo cf-ranges apply` writes `cloudflare-ranges.caddy` and validates the tree. Later
   changes to either file go through `sudo app-apply edge config <file>`.
3. Create the Origin CA certificate for `jainavinfotech.in` and `*.jainavinfotech.in`
   ([cloudflare.md](cloudflare.md#ssl)), then
   `sudo app-apply edge cert jainav origin.pem origin-key.pem`.
4. `sudo app-apply jainav site jainav.caddy` and `sudo app-apply edge compose compose.yml`.
5. `sudo app-compose edge up -d`. `app-apply` creates the four internal edge networks.

**Jainav**, in `/srv/jainav`:

- `.env`: `cp env.example .env` (`docker/env.example`) and fill it in. Generate passwords with
  `openssl rand -base64 32 | tr -d '/+='`.
  - `BACKUP_AGE_RECIPIENT` comes from the backup key: make it first
    ([backups.md](backups.md#the-key)). It is the same key as `BACKUP_RECIPIENT` in
    `/etc/apps/jainav.conf`. Compose checks every required value on every command, so nothing
    starts without it.
- `production.env` and `staging.env`: the apps' settings, keys from `/.env.example`.
  - `NODE_ENV=production`, `NEXT_PUBLIC_SITE_URL` (`https://jainavinfotech.in` /
    `https://staging.jainavinfotech.in`), `PAYLOAD_SECRET`, `CRON_SECRET`.
  - `DATABASE_URL=postgres://jainav:<APP_DB_PASSWORD>@postgres:5432/jainav`; staging uses
    `jainav_staging` with `STAGING_DB_PASSWORD`.
  - R2 (`S3_*`, `NEXT_PUBLIC_CDN_URL`, `DOWNLOADS_BASE_URL`), Turnstile, Telegram, Sentry.
  - Resend: `RESEND_API_KEY`, `EMAIL_FROM`. Set them before real visitors arrive. Without the key
    the app still starts, so a deploy can come before Resend is ready, but every send fails:
    - each start logs `RESEND_API_KEY is not set` and posts it to Telegram;
    - sign-in codes and form emails aren't sent, and each failure is only logged;
    - email jobs retry, then alert on Telegram. After adding the key, restart the app and check
      failed jobs under System → Payload Jobs.
  - `OTP_PEPPER` (customer sign-in codes; `openssl rand -hex 32`, one per environment).
  - Licensing: `LICENSING_PRIVATE_KEY`, `LICENSING_KEY_ID`, `LICENSE_KEY_ENCRYPTION_KEY`,
    `DEVICE_ID_PEPPER` from `pnpm gen:licensing-keys`, one set per environment
    ([licensing.md](licensing.md)). Without them the licensing API answers 503 and paid orders
    can't be fulfilled. The last two must never change once licenses exist.
  - Staging only: `STAGING_BASIC_AUTH=1`, Razorpay test keys and webhook secret
    ([store.md](store.md)), its own R2 buckets and `https://cdn-staging.jainavinfotech.in`
    ([cloudflare.md](cloudflare.md#r2)).
- Install each env file as root: `sudo install -m 600 -o root -g root .env /srv/jainav/.env`.
  Env-file lines may not start with `COMPOSE_`.
- `images.env`: copy `docker/images.env.example` to `/srv/jainav/images.env`
  (`sudo install -m 644 -o root -g root images.env.example /srv/jainav/images.env`). It names the
  image each service runs, including the tools image of each environment (`TOOLS_IMAGE`,
  `TOOLS_STAGING_IMAGE`); `app-deploy` rewrites a line after each deploy. On a server that
  already has the file, add the two `TOOLS_*` lines.
- `postgres/roles.sh`:
  `sudo install -d -m 755 /srv/jainav/postgres && sudo install -m 755 roles.sh /srv/jainav/postgres/roles.sh`
  (from `docker/postgres/roles.sh`).
- Then `sudo app-apply jainav compose compose.prod.yml`. It refuses a file that could reach the
  host or another app; it also needs the env files and `roles.sh` to exist. It creates
  `backup-out`. The backup service gets its image from `app-deploy` (§3).

## 3. First start

```bash
sudo app-compose jainav up -d postgres umami
sudo app-compose jainav ps   # postgres healthy, umami running
```

`postgres/roles.sh` creates the roles and databases the first time the volume is created. Every
command through `app-compose` uses the project `jainav` and the files named in
`/etc/apps/jainav.conf`.

The backup job's image comes from CI too (`backup-image.yml` builds `backup-<commit>`). Deploy it
once by hand, with a registry token (read:packages) on stdin:

```bash
read -rs PAT && printf '%s\n' "$PAT" | sudo app-deploy jainav backup backup-<commit>@sha256:<digest>
```

Then the settings archive timer (`sudo systemctl enable --now app-config-archive@jainav.timer`,
§1 step 15) and the edge:

```bash
sudo app-compose edge up -d
sudo app-compose edge ps
```

The apps start with the first deploy (§5). Their healthcheck calls `/api/v1/health`, which
initializes Payload, and Payload applies the migrations (`prodMigrations`).

Check, then fill the rest:

- `sudo hostwatch check` is clean;
- `journalctl COM_DOCKER_COMPOSE_PROJECT=jainav -n 5` shows lines;
- the leak test passes ([edge.md §6](edge.md#6-the-leak-test));
- `sudo systemctl restart docker` keeps 443 answering;
- `/etc/hostwatch.env` is filled in (`root:root 0600`) and the timers are enabled (§1 step 15).

**Launch gate.** Authenticated origin pulls are on for every zone, and tested, before the first
container of a second app runs on this server ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)).
Cloudflare Access on `/admin*` and `/api/users/*` comes before the first production deploy.

After the first deploy of each environment, load the starting content with the tools image
(§8):

```bash
sudo app-compose jainav tools production - pnpm seed
```

Production never creates the dev admin. Create the Owner account in the admin's first-user
screen (`https://jainavinfotech.in/admin`, behind Cloudflare Access), then review and publish the seeded
drafts there. The legal pages need their approved texts first (spec §8.13).

## 4. GitHub setup (once)

- **Repository variables** (Settings → Secrets and variables → Actions → Variables):
  - `DEPLOY_ENABLED` = `true`. Until it is set, `.github/workflows/deploy.yml` skips every run.
  - Public build values, baked into each environment's image. One set per environment,
    `STAGING_*` and `PRODUCTION_*`:
    - `_SITE_URL`, `_CDN_URL`, `_TURNSTILE_SITE_KEY`;
    - `_UMAMI_URL`, `_UMAMI_WEBSITE_ID`, `_SENTRY_DSN`;
    - `_SMOKE_ADMIN_ACCESS` (`1` once Cloudflare Access protects `/admin`).

    They are repository variables, not environment variables. That way the build job needs no
    environment, and production asks for approval once, at the deploy job.

- **Repository secret** `SMOKE_BASIC_AUTH` = `user:password` of the staging basic auth.
- **Environments** `staging` and `production` (Settings → Environments), each with these
  secrets:
  - `DEPLOY_HOST` = `ssh.jainavinfotech.in`, `DEPLOY_USER` = `deploy-jainav` (the same in both).
  - `DEPLOY_SSH_KEY`: the private key of that environment, made in §1 step 6: `gha-jainav-staging`
    for `staging`, `gha-jainav-production` for `production`. Each key's public half is on the
    server with a forced command that deploys only its own environment, so a staging key cannot
    deploy to production.
  - `DEPLOY_KNOWN_HOSTS`: `ssh.jainavinfotech.in ` followed by the contents of the server's
    `/etc/ssh/ssh_host_ed25519_key.pub`.
  - `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`: the Access service token
    `github-deploy-jainav` for the SSH tunnel ([cloudflare.md](cloudflare.md#ssh-tunnel)).
- **Environment rules:**
  - `staging`: deployment branches limited to `main`.
  - `production`: Tanishq as a required reviewer, and deployment tags limited to the rule
    `v[0-9]*`.
- Images go to GHCR as private packages. Each deploy signs the VPS in with that job's
  short-lived token (sent on stdin, kept in a Docker config of its own) and signs it out again.
- Every image carries the label `org.opencontainers.image.version` with the exact tag it is
  deployed under; `app-deploy` refuses an image without it.
- The workflows pin every action to a commit; Dependabot proposes updates after 14 days.

## 5. Deploy

- **Staging:** every merge to `main`. The `build` job builds `staging-<commit>` and the tools
  image. The `deploy` job sends one request over the SSH tunnel with the `staging` key:
  `v1 deploy <image>@sha256:<digest> <tools>@sha256:<digest>`, and the job's registry token on the
  next line. The key's forced command runs `sudo app-deploy staging`, which pulls both images,
  checks their labels, switches the service and waits for the healthcheck. The `smoke` job runs
  `tests/smoke`.
- **Production:** push a tag, e.g. `git tag v1.0.0 && git push origin v1.0.0`. `build` makes
  `prod-v1.0.0` with the production values. `deploy` waits for the required reviewer, then
  deploys it the same way, with the `production` key. Never promote a staging image:
  `NEXT_PUBLIC_*` values differ.
- **By hand (admin form):** the registry token goes on stdin, never on the command line:

  ```bash
  read -rs PAT && printf '%s\n' "$PAT" | ssh jainav sudo app-deploy jainav production \
    prod-v1.0.0@sha256:<digest> tools-<commit>@sha256:<digest>
  ```

  A bare tag is accepted too; `app-deploy` records the digest it resolved.

- `app-deploy` points the service at the new image and waits for the healthcheck. In production
  it first dumps the databases (age-encrypted, in `/srv/jainav/predeploy`; the newest three are
  kept). If the app never turns healthy, it **rolls back to the previous image** on its own and
  alerts on Telegram.
  - Every deploy is a line in `/srv/jainav/deploys.log`; a failed or rolled-back one says what
    happened, including "migrations from <tools image> stay applied" when a migration ran first.
  - It then deletes that environment's older images, keeping the new one, the rollback target
    and each environment's recorded tools image.
  - A deploy waits for one already running (CI up to 10 minutes, the admin form 5). Ctrl-C before
    the switch stops it cleanly; from the switch on it is ignored.
- Migrations run when the new container starts. Keep them backward-compatible for one release
  (add columns before using them, drop them a release later), so a rollback still works.

## 6. Roll back

```bash
ssh jainav 'tail -5 /srv/jainav/deploys.log'     # find the previous image
read -rs PAT && printf '%s\n' "$PAT" | ssh jainav sudo app-deploy jainav production \
  prod-v1.0.0@sha256:<digest>
```

The previous image is still on the server. For an older one, redeploy its tag; the token pulls
it. A rollback does not undo migrations: keep them backward-compatible (§5).

## 7. Change the server setup

Deploys only replace the app images. Everything else goes through `app-apply`, from
`/home/ops/incoming`:

- **Compose file** (`compose.prod.yml`, the edge's `compose.yml`): `sudo app-apply jainav compose
compose.prod.yml`. It checks the file (no privileged mode, host paths, ports, device access;
  limits and logging as required; no interpolation outside the image, environment, command,
  entrypoint, healthcheck and `x-*` keys; ulimits only `nofile` and `nproc`) and waits up to five
  minutes for a deploy in progress. Then apply it:
  - a changed service definition: `sudo app-compose jainav up -d <service>` recreates it;
  - a changed bind-mounted file (the Caddy files, `roles.sh`) does not recreate anything: Caddy
    files use `app-apply edge reload`, which validates the live tree and reloads Caddy without
    downtime. A new `edge.env` needs a recreate: `sudo app-compose edge up -d`
    ([edge.md §2](edge.md#2-site-files-and-their-checks)). Run it between 01:00 and 07:00 IST.
- **Caddy site, certificates, ranges, redaction:** `app-apply jainav site|edge config|edge cert|edge
redact`; see [edge.md](edge.md).
- **Env files:** edit and `sudo install` them again, then recreate the service that reads them.
  `images.env` is written by `app-deploy`; never edit it while a deploy runs.
- **Host scripts and settings:** copy the new kit to `/root/kit` and run `install.sh` again. It
  rewrites only what differs, and never overwrites `/etc/apps/*.conf`, `edge.env` or
  `hostwatch.env`.
- `postgres/roles.sh` only runs on an empty volume: add a database later with `psql` instead.

A recreate costs a few seconds of downtime for that service; Postgres is not recreated by a
deploy.

## 8. One-off commands

Run them with the tools image of an environment, on its networks and with its env files, through
`app-compose`:

```bash
sudo app-compose jainav tools production - pnpm payload migrate:status
sudo app-compose jainav tools production - pnpm import:release <tag>
sudo app-compose jainav tools staging - pnpm seed
```

The `-` is the tools image the environment's last deploy recorded in `images.env`
(`TOOLS_IMAGE`, `TOOLS_STAGING_IMAGE`). The command runs by digest, with a memory limit, and
`app-compose` refuses it if the server has no memory headroom. To run another image, give its
reference as `<tag>@sha256:<digest>`; a bare tag is refused. Env-file values with `$` or a
backslash must be in single quotes, as Compose reads them.

`import:release` imports a VYRO release from GitHub `nanu1605/vyro-releases`. It checks the
installer's SHA-256 against `SHA256SUMS.txt` and GitHub, takes the updater signature from
`latest.json`, uploads the installer to R2 and saves the release as a draft. The Owner publishes
it in the admin, which also refreshes the cached download page. Add `-- --publish` to publish
from the command line.

## 9. Break-glass

If the tunnel or SSH does not work:

1. **Web Console.** hPanel → VPS → Web Console. It is a serial terminal (it shows "Starting
   serial terminal"), so it does not depend on sshd or the firewall. Log in as `root` with the
   password from the password manager. sshd refuses root, but the console does not use sshd.
   Check `systemctl status cloudflared ssh`, `journalctl -u cloudflared -n 50`,
   `cf-ranges verify`, and fix it there. If `journalctl -u ssh -n 30` shows
   `Address already in use` or `Missing privilege separation directory`, an old sshd still holds
   port 22: `ss -tlnp 'sport = :22'` shows its pid. `kill` that pid, then run
   `systemctl reset-failed ssh.service; systemctl start ssh.service` (the unit runs `sshd -t`
   itself once it has made `/run/sshd` again; a bare `sshd -t` fails while that directory is
   missing). Afterwards `ss -tlnp 'sport = :22'` must show only `127.0.0.1:22` and `[::1]:22`.
   To reach SSH from outside for the work in hand:
   - write your bare IPv4 address into `/etc/cf-ranges/bootstrap-ssh` and run `cf-ranges firewall`,
     which opens port 22 in the host firewall to it;
   - sshd listens on loopback only, so add `/etc/ssh/sshd_config.d/01-breakglass.conf` with
     `ListenAddress <the server's public IPv4>`, then `sshd -t && systemctl reload ssh`;
   - add a TCP 22 rule for your address in hPanel's firewall.

   Undo all three afterwards (`cf-ranges firewall` and the reload again). `hostwatch` alerts while
   either file exists.

2. **Last resort: hPanel's "Reset SSH" and "Reset firewall".** They undo the hardening and the
   provider-side rules. Afterwards run §1 steps 2, 11 and 14 again.
3. **Emergency mode** (hPanel) is for repairing the filesystem, not for getting a login.

Keep the root password in the password manager, and check the Web Console login again after any
change to sshd or the firewall.

## 10. Rehearsal

Rehearse the host on a local Ubuntu 24.04 VM before the real server (Docker Desktop has no
journald, sudo or sshd, so it can only rehearse the apps). In the VM:

- follow §1 with `bash /root/kit/host/install.sh --harden-without-tunnel` in place of `--harden`
  (the VM has no tunnel; this flag is for a rehearsal VM only);
- run `install.sh` twice, then reboot: the filters come up before Docker, and a malformed range
  file must leave Docker refusing to start;
- `systemctl restart docker` must keep 443 answering;
- the CI deploy form through a local sshd with forced-command keys, and the admin form: refusals
  for a bad verb, extra words, a missing digest, a wrong tag pattern and an image of another app;
- `app-apply` with hostile files: `tests/host/app-apply.sh` runs these checks, and
  `tests/host/app-deploy.sh` covers `app-deploy`;
- `sudo hostwatch check`, and the leak test ([edge.md §6](edge.md#6-the-leak-test)).

For a rehearsal of the apps on Docker Desktop (port 8443, self-signed certificates, a local
folder for the backup bucket), add `docker/compose.local.yml` as a second `-f` file: it switches
every service to the `json-file` log driver, because the production file's `journald` driver does
not exist there. The SSH tunnel and the GitHub side can only be checked against the real
accounts.
