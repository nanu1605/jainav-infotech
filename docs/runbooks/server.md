# Server: set up, deploy, roll back

One VPS runs everything (spec §18.2): the production and staging apps, one Postgres server
(databases `jainav`, `jainav_staging`, `umami`), Umami, Caddy and the backup job. Files live in
`/srv/jainav`; the definitions are in `docker/` in this repository.

Cloudflare sits in front ([cloudflare.md](cloudflare.md)). Backups: [backups.md](backups.md).
Monitoring: [monitoring.md](monitoring.md). The order of everything for Launch 1:
[launch.md](launch.md).

## 1. Provision the VPS

- Ubuntu 24.04 LTS, 4 GB RAM, 2 vCPU, in Mumbai or Bengaluru (Singapore if neither).
- Sign in as root once (the provider's console or its first SSH session), then:

  ```bash
  adduser --disabled-password --gecos '' deploy
  install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
  install -m 600 -o deploy -g deploy ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
  install -d -o deploy -g deploy /srv/jainav
  # SSH: keys only, no root login. A drop-in that sorts before the provider's own (e.g.
  # 50-cloud-init.conf): sshd uses the first value it reads for each option.
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin no\n' \
    > /etc/ssh/sshd_config.d/00-hardening.conf
  sshd -t && sshd -T | grep -Ei '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
  # expect: no / no / no
  systemctl restart ssh
  apt-get update && apt-get install -y unattended-upgrades && dpkg-reconfigure -f noninteractive unattended-upgrades
  ```

- Install Docker Engine and the Compose plugin from Docker's apt repository
  (docs.docker.com/engine/install/ubuntu), then `usermod -aG docker deploy`. Membership of the
  `docker` group is root-equivalent: only the `deploy` key and the deploy pipeline get it.
- Install `cloudflared` and connect the **SSH tunnel** ([cloudflare.md](cloudflare.md#ssh-tunnel)).
  Deploys and your own SSH sessions go through it, so port 22 never has to be open to the
  internet.
- **Firewall: use the VPS provider's network firewall**, not ufw. Docker publishes container
  ports through its own iptables rules, which bypass ufw. Rules:
  - TCP 443 from Cloudflare's ranges only: <https://www.cloudflare.com/ips-v4> and
    <https://www.cloudflare.com/ips-v6>. Recheck the lists every few months.
  - TCP 22: closed. While setting up, open it to your own IP only, and close it once the SSH
    tunnel works. The provider's web console is the way in if the tunnel ever breaks.
  - Everything else: deny. Port 80 stays closed (Cloudflare connects over HTTPS).
  - Check: `curl -k https://<server-ip>` and `ssh <server-ip>` from your machine must time out.

Your own SSH config (`~/.ssh/config`), for the commands below:

```
Host jainav
  HostName ssh.{{DOMAIN}}
  User deploy
  ProxyCommand cloudflared access ssh --hostname %h
```

## 2. Put the files in place

From a checkout of the commit you are deploying:

```bash
scp -r docker/compose.prod.yml docker/Caddyfile docker/deploy.sh docker/env.example \
  docker/postgres docker/backup jainav:/srv/jainav/
ssh jainav 'chmod +x /srv/jainav/deploy.sh /srv/jainav/postgres/roles.sh /srv/jainav/backup/*.sh'
```

On the server, in `/srv/jainav`:

- `.env`: `cp env.example .env` and fill it in. Generate passwords with
  `openssl rand -base64 32 | tr -d '/+='`.
  - `BACKUP_AGE_RECIPIENT` comes from the backup key: make it first ([backups.md](backups.md#the-key)).
    Compose checks every required value on every command, so nothing starts without it.
- `production.env` and `staging.env`: the apps' settings, keys from `/.env.example`.
  - `NODE_ENV=production`, `NEXT_PUBLIC_SITE_URL` (`https://{{DOMAIN}}` /
    `https://staging.{{DOMAIN}}`), `PAYLOAD_SECRET`, `CRON_SECRET`.
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
    ([store.md](store.md)), its own R2 buckets.
  - `chmod 600 .env production.env staging.env`.
- `certs/origin.pem` and `certs/origin-key.pem`: the Cloudflare Origin CA certificate
  ([cloudflare.md](cloudflare.md#ssl)); `chmod 600 certs/origin-key.pem`.

## 3. First start

```bash
cd /srv/jainav
docker compose -f compose.prod.yml up -d postgres umami caddy backup
docker compose -f compose.prod.yml ps   # postgres healthy, the others running
```

`postgres/roles.sh` creates the roles and databases the first time the volume is created. The
apps start with the first deploy (section 5). Their healthcheck calls `/api/v1/health`, which
initializes Payload, and Payload applies the migrations (`prodMigrations`).

After the first deploy of each environment, load the starting content with the tools image.
The image holds the full source and dependencies; each deploy pulls the one for its commit
(`tools-<commit>`, see `docker images`):

```bash
docker run --rm --network jainav_default --env-file production.env \
  ghcr.io/nanu1605/jainav-infotech:tools-<commit> pnpm seed
```

Production never creates the dev admin. Create the Owner account in the admin's first-user
screen (`https://{{DOMAIN}}/admin`, behind Cloudflare Access), then review and publish the seeded
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
  - `DEPLOY_HOST` = `ssh.{{DOMAIN}}`, `DEPLOY_USER` = `deploy`.
  - `DEPLOY_SSH_KEY`: a key made only for deploys, `ssh-keygen -t ed25519 -f deploy_key -N ''`.
    Its public half goes in the server's `authorized_keys`.
  - `DEPLOY_KNOWN_HOSTS`: `ssh.{{DOMAIN}} ` followed by the contents of the server's
    `/etc/ssh/ssh_host_ed25519_key.pub`.
  - `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`: the Access service token for the SSH
    tunnel ([cloudflare.md](cloudflare.md#ssh-tunnel)).
  - `production` only: add Tanishq as a required reviewer and limit deployments to tags (`v*`).
- Images go to GHCR as private packages. Each deploy signs the VPS in with that job's
  short-lived token and signs it out again.
- The workflows pin every action to a commit; Dependabot proposes updates after 14 days.

## 5. Deploy

- **Staging:** every merge to `main`. The `build` job builds `staging-<commit>` and the tools
  image. The `deploy` job runs `/srv/jainav/deploy.sh app-staging <image>` over the SSH tunnel
  and pulls the tools image. The `smoke` job runs `tests/smoke`.
- **Production:** push a tag, e.g. `git tag v1.0.0 && git push origin v1.0.0`. `build` makes
  `prod-v1.0.0` with the production values. `deploy` waits for the required reviewer, then
  deploys it the same way. Never promote a staging image: `NEXT_PUBLIC_*` values differ.
- `deploy.sh` points the service at the new image and waits for the healthcheck. If the app
  never turns healthy, it **rolls back to the previous image** on its own.
  - Every successful deploy is a line in `/srv/jainav/deploys.log`.
  - It then deletes that environment's older images, keeping the new one and the rollback
    target.
- Migrations run when the new container starts. Keep them backward-compatible for one release
  (add columns before using them, drop them a release later), so a rollback still works.

## 6. Roll back

```bash
ssh jainav 'tail -5 /srv/jainav/deploys.log'          # find the previous image
ssh jainav '/srv/jainav/deploy.sh app ghcr.io/nanu1605/jainav-infotech:prod-v1.0.0'
```

The previous image is still on the server. For an older one, sign in to GHCR first, as in
section 8.

## 7. Change the server setup

Deploys only replace the app images. After changing `compose.prod.yml`, `Caddyfile`, `backup/`
or `postgres/` in the repository, copy the changed files as in section 2, then:

```bash
cd /srv/jainav
C="docker compose -f compose.prod.yml"
$C up -d --build backup umami
# Compose doesn't see a changed Caddyfile (a mounted file): reload Caddy, without downtime.
$C exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

After replacing the files in `certs/`, or if the reload reports no change, use
`$C restart caddy` instead. `postgres/roles.sh` only runs on an empty volume: add a database
later with `psql` instead.

## 8. One-off commands

Run them with the tools image of the deployed commit, on the Compose network, with that
environment's settings:

```bash
T=ghcr.io/nanu1605/jainav-infotech:tools-<commit>
docker run --rm --network jainav_default --env-file production.env $T pnpm payload migrate:status
docker run --rm --network jainav_default --env-file production.env $T pnpm import:release v0.3.0
```

The deployed commit's tools image is already on the server. For another commit, sign in to
GHCR first, then sign out again:

```bash
docker login ghcr.io -u <github-user>     # a token with read:packages only
docker logout ghcr.io
```

`import:release` imports a VYRO release from GitHub `nanu1605/vyro-releases`. It checks the
installer's SHA-256 against `SHA256SUMS.txt` and GitHub, takes the updater signature from
`latest.json`, uploads the installer to R2 and saves the release as a draft. The Owner publishes
it in the admin, which also refreshes the cached download page. Add `-- --publish` to publish
from the command line.

## Rehearsal

The whole stack was rehearsed locally on 2026-10-16 (port 8443, self-signed certificates, a
local folder for the backup bucket). These all worked:

- both apps healthy, with migrations applied under their own roles;
- production smoke tests 8/8;
- staging basic auth (the machine APIs exempt) and `X-Robots-Tag`;
- the www → apex redirect and Umami;
- backup and restore test;
- `deploy.sh` both ways: a good image went live, and a broken image rolled back.

The SSH tunnel and the GitHub side can only be checked against the real accounts.
