# Server: set up, deploy, roll back

One VPS runs everything (spec §18.2): the production and staging apps, one Postgres server
(databases `jainav`, `jainav_staging`, `umami`), Umami, Caddy and the backup job. Files live in
`/srv/jainav`; the definitions are in `docker/` in this repository.

Cloudflare sits in front (see [cloudflare.md](cloudflare.md)). Backups: [backups.md](backups.md).
Monitoring: [monitoring.md](monitoring.md). The order of everything for Launch 1:
[launch.md](launch.md).

## 1. Provision the VPS

- Ubuntu 24.04 LTS, 4 GB RAM, 2 vCPU, in Mumbai or Bengaluru (Singapore if neither).
- Sign in as root once, then:

  ```bash
  adduser --disabled-password --gecos '' deploy
  mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
  chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
  # SSH: keys only, no root login.
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
  systemctl restart ssh
  apt-get update && apt-get install -y unattended-upgrades && dpkg-reconfigure -f noninteractive unattended-upgrades
  ```

- Install Docker Engine and the Compose plugin from Docker's apt repository
  (docs.docker.com/engine/install/ubuntu), then `usermod -aG docker deploy`.
- **Firewall: use the VPS provider's network firewall**, not ufw. Docker publishes container
  ports through its own iptables rules, which bypass ufw. Rules:
  - TCP 22 from your own IP address(es) only.
  - TCP 443 from Cloudflare's ranges only: <https://www.cloudflare.com/ips-v4> and
    <https://www.cloudflare.com/ips-v6>. Recheck the lists every few months.
  - Everything else: deny. Port 80 stays closed (Cloudflare connects over HTTPS).
  - Check: `curl -k https://<server-ip>` from your own machine must time out.

## 2. Put the files in place

From a checkout of the commit you are deploying:

```bash
ssh deploy@<server> 'sudo mkdir -p /srv/jainav && sudo chown deploy: /srv/jainav'
scp -r docker/compose.prod.yml docker/Caddyfile docker/deploy.sh docker/postgres docker/backup deploy@<server>:/srv/jainav/
ssh deploy@<server> 'chmod +x /srv/jainav/deploy.sh /srv/jainav/postgres/roles.sh /srv/jainav/backup/*.sh'
```

On the server, in `/srv/jainav`:

- `.env`: copy `docker/env.example` and fill it in. Generate passwords with
  `openssl rand -base64 32 | tr -d '/+='`.
- `production.env` and `staging.env`: the apps' settings, keys from `/.env.example`.
  - `NODE_ENV=production`, `NEXT_PUBLIC_SITE_URL` (`https://{{DOMAIN}}` /
    `https://staging.{{DOMAIN}}`), `PAYLOAD_SECRET`, `CRON_SECRET`.
  - `DATABASE_URL=postgres://jainav:<APP_DB_PASSWORD>@postgres:5432/jainav`; staging uses
    `jainav_staging` with `STAGING_DB_PASSWORD`.
  - R2 (`S3_*`, `NEXT_PUBLIC_CDN_URL`, `DOWNLOADS_BASE_URL`), Resend, Turnstile, Telegram, Sentry.
  - Staging only: `STAGING_BASIC_AUTH=1`, Razorpay test keys, its own R2 buckets.
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
apps start with the first deploy (next section). Their healthcheck calls `/api/v1/health`,
which initializes Payload, and Payload applies the migrations (`prodMigrations`).

Then, once per environment, load the starting content with the tools image (full source and
dependencies; CI pushes `tools-<commit>` on every deploy):

```bash
docker run --rm --network jainav_default --env-file production.env \
  ghcr.io/nanu1605/jainav-infotech:tools-<commit> pnpm seed
```

Production never creates the dev admin. Create the Owner account in the admin's first-user
screen (`https://{{DOMAIN}}/admin`, behind Cloudflare Access), then review and publish the seeded
drafts there. The legal pages need their approved texts first (spec §8.13).

## 4. GitHub setup (once)

- Repository variable `DEPLOY_ENABLED` = `true`. Until it is set, `.github/workflows/deploy.yml`
  skips every run.
- Environments `staging` and `production` (Settings → Environments):
  - Variables (baked into the image at build time): `NEXT_PUBLIC_SITE_URL`,
    `NEXT_PUBLIC_CDN_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_UMAMI_URL`,
    `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `NEXT_PUBLIC_SENTRY_DSN`; `SMOKE_ADMIN_ACCESS` = `1` once
    Cloudflare Access protects `/admin`.
  - Secrets: `DEPLOY_HOST`, `DEPLOY_USER` (`deploy`), `DEPLOY_SSH_KEY` (a key made only for
    deploys: `ssh-keygen -t ed25519 -f deploy_key -N ''`, public half in the server's
    `authorized_keys`), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <server>`). Staging also:
    `SMOKE_BASIC_AUTH` = `user:password` of the staging basic auth.
  - `production`: add Tanishq as a required reviewer and limit deployments to tags (`v*`).
- Images go to GHCR as private packages; each deploy signs the VPS in with that job's
  short-lived token.

## 5. Deploy

- **Staging:** every merge to `main`. The workflow builds `staging-<commit>` with the staging
  variables, runs `/srv/jainav/deploy.sh app-staging <image>`, then the smoke tests
  (`tests/smoke`).
- **Production:** push a tag, e.g. `git tag v1.0.0 && git push origin v1.0.0`. After the
  required reviewer approves, the workflow builds `prod-v1.0.0` with the production variables
  and deploys it the same way. Never promote a staging image: `NEXT_PUBLIC_*` values differ.
- `deploy.sh` points the service at the new image, waits for the healthcheck and, if the app
  never turns healthy, **rolls back to the previous image** on its own. Every successful deploy
  is a line in `/srv/jainav/deploys.log`.
- Migrations run when the new container starts. Keep them backward-compatible for one release
  (add columns before using them, drop them a release later), so a rollback still works.

## 6. Roll back

```bash
ssh deploy@<server> 'tail -5 /srv/jainav/deploys.log'          # find the previous image
ssh deploy@<server> '/srv/jainav/deploy.sh app ghcr.io/nanu1605/jainav-infotech:prod-v1.0.0'
```

## 7. Change the server setup

Deploys only replace the app images. After changing `compose.prod.yml`, `Caddyfile`, `backup/`
or `postgres/` in the repository, copy the changed files as in step 2, then:

```bash
cd /srv/jainav && docker compose -f compose.prod.yml up -d --build caddy backup umami
```

`postgres/roles.sh` only runs on an empty volume: add a database later with `psql` instead.

## 8. One-off commands

Run them with the tools image of the deployed commit, on the Compose network, with that
environment's settings:

```bash
T=ghcr.io/nanu1605/jainav-infotech:tools-<commit>
docker run --rm --network jainav_default --env-file production.env $T pnpm payload migrate:status
docker run --rm --network jainav_default --env-file production.env $T pnpm import:release v0.3.0
```

`import:release` imports a VYRO release from GitHub `nanu1605/vyro-releases`: it checks the
installer's SHA-256 against `SHA256SUMS.txt` and GitHub, takes the updater signature from
`latest.json`, uploads the installer to R2 and saves the release as a draft. The Owner publishes
it in the admin (that also refreshes the cached download page). Add `-- --publish` to publish
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
