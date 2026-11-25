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
  with `sudo`, through the SSH tunnel, in an interactive `ssh jainav` session
  ([§2](#2-put-the-files-in-place)): `ssh jainav sudo …` has no terminal for sudo to ask on.
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

12. **A second admin key.** With a single key, losing that file or the PC means no SSH until you
    fix it from the Web Console. Protect the first key with a passphrase (`ssh-keygen -p -f <key>`)
    and give `ops` a second key:
    - make it on another device if you have one. Otherwise make it on the same PC with its own
      passphrase, and keep the private key file and its passphrase in the password manager, so the
      key outlives the PC:

      ```bash
      ssh-keygen -t ed25519 -a 100 -C jainav-backup-admin -f "$HOME/.ssh/jainav_vps_backup"
      ```

    - put its `.pub` in the kit as `keys/ops-<name>.pub` and run step 8's command again with a
      second `--admin-key-fpr` for it (the SHA256 line of `ssh-keygen -lf` on the `.pub`).
      `install.sh` only adds keys to `ops`; the keys already there stay, including any added by
      hand;
    - log in with it once through the tunnel: copy step 10's `jainav` entry under a new name and
      change only its `IdentityFile` to the new key. With `IdentitiesOnly yes` it offers that key
      alone, so the login proves the new key works.
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
    filled in ([monitoring.md](monitoring.md), [backups.md](backups.md)); §3 says when each goes
    on. `install.sh` prints the exact commands; they are of this form:

    ```bash
    sudo systemctl enable --now hostwatch.timer hostwatch-daily.timer cf-ranges-check.timer
    sudo systemctl enable --now app-config-archive@jainav.timer
    ```

    `hostwatch daily` alerts when one of them is not enabled. Check them:

    ```bash
    systemctl is-enabled hostwatch.timer hostwatch-daily.timer cf-ranges-check.timer app-config-archive@jainav.timer
    ```

    It prints `enabled` four times. After the next 5-minute mark,
    `journalctl -u hostwatch.service -n 30 -o cat --no-pager` must not show
    "heartbeat not delivered", and the hostwatch monitor shows its first ping. The backup monitor
    gets its first one after the first backup ([monitoring.md](monitoring.md)).

## 2. Put the files in place

Everything root runs lives in `/usr/local/sbin` (installed by `install.sh`) and reads its settings
from `/etc/apps/<name>.conf` (`root:root 0644`). Every file that root or a container reads goes
through `app-apply`, which checks it first, copies it (never moves it) and keeps the file it
replaces. Copy files to `/home/ops/incoming` with `scp` from the repository root on your machine
(`jainav:incoming/`), and name each one by its full path, `~/incoming/<file>`: the scripts take the
path exactly as given. `/srv/jainav` and `/srv/edge` are root's alone (0750), so `ops` can't `cd`
there, and a pattern such as `/srv/jainav/*.env` doesn't expand: name every file.

| Path                                                | Owner and mode | Put there by                                                                                |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `/etc/apps/jainav.conf`, `edge.conf`                | root, 0644     | `install.sh` once; fill `BACKUP_RECIPIENT`                                                  |
| `/etc/hostwatch.env`                                | root, 0600     | `install.sh` copies the example once; filled on the server (below)                          |
| `/srv/jainav`                                       | root, 0750     | `install.sh`                                                                                |
| `/srv/jainav/compose.prod.yml`                      | root, 0644     | `app-apply jainav compose <file>`                                                           |
| `/srv/jainav/postgres/roles.sh`                     | root, 0755     | `sudo install` by hand, from `docker/postgres/`                                             |
| `/srv/jainav/.env`, `production.env`, `staging.env` | root, 0600     | `sudo install -m 600` by hand, then filled on the server (below)                            |
| `/srv/jainav/images.env`                            | root, 0644     | by hand once (below); then only `app-deploy` writes it                                      |
| `/srv/jainav/backup-out`                            | root, 0755     | `app-apply jainav compose` creates it                                                       |
| `/srv/edge/edge.env`                                | root, 0600     | `install.sh` copies the example once; then `app-apply edge env <file>` (below)              |
| `/srv/edge/config/Caddyfile`, `snippets.caddy`      | root, 0644     | the first ones from `install.sh`; then `app-apply edge config <file>`                       |
| `/srv/edge/config/sites/jainav.caddy`               | root, 0644     | `app-apply jainav site <file>`                                                              |
| `/srv/edge/config/log-redact.d/<app>.caddy`         | root, 0644     | `app-apply edge redact <app> <file>` ([edge.md §7](edge.md#7-log-redaction-for-other-apps)) |
| `/srv/edge/certs/<app>/`                            | root, key 0600 | `app-apply edge cert <app> <origin.pem> <origin-key.pem> <aop-ca.pem>`                      |
| `/srv/edge/certs/<app>/aop-client.pem`              | root, 0644     | `sudo install` by hand, [edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls) |
| `/srv/edge/config/cloudflare-ranges.caddy`          | root, 0644     | `cf-ranges apply`, which goes through `app-apply edge ranges`                               |
| `/srv/edge/compose.yml`                             | root, 0644     | `app-apply edge compose <file>`                                                             |

Locks are in `/run/app-locks` (root, 0700). The scripts create it and refuse to run if it has
another owner or can be written by others.

**One session.** Run the server's steps below, and those of §3, in an interactive `ssh jainav`
session (the prompt starts `ops@`). Start it with `sudo -v`, and run that again after a long pause,
so that sudo never asks for its password in the middle of a pasted block. Keep the session open
until you are done, and close it afterwards if anything printed a secret. Paste every line that
reads a value (`read`, `addenv`) on its own: in a pasted block, the next line would be taken as
the value.

Secrets are typed at hidden prompts on the server and never go through a file made elsewhere.
Define this helper once per session; pasting a function definition runs no prompt:

```bash
set +o history; addenv() { local k=$1 v f re='^[A-Za-z0-9_.~:/?&=+%@-]+$'; shift; [ $# -gt 0 ] || { echo "usage: addenv NAME FILE..."; return 2; }; sudo -v || return 1; for f in "$@"; do sudo test -f "$f" || { echo "refused $k: $f does not exist (nothing asked, nothing written)"; return 1; }; if sudo grep -q "^$k=" "$f"; then echo "refused $k: already in $f (nothing asked, nothing written)"; return 1; fi; done; read -rsp "$k: " v; echo; if [[ $v =~ $re ]]; then printf '%s=%s\n' "$k" "$v" | sudo tee -a "$@" >/dev/null && echo "added $k (${#v} characters) to $*"; else echo "refused $k: empty, or a character other than letters, digits and _.~:/?&=+%@-"; fi; unset v; }
```

`addenv NAME FILE...` appends `NAME=value` to each file. The value goes from the shell to
`sudo tee` on stdin, so it never shows on screen, in a command line or in the history
(`set +o history` keeps the session's commands out of it). It refuses a name that a file already
has, and a value that Compose or `app-compose` would read differently: one with `$`, quotes,
spaces, `#` or a backslash.

**The edge** (details: [edge.md](edge.md)). Order matters. Copy its files first, from the
repository root on your machine:

```bash
scp docker/edge/compose.yml docker/edge/config/sites/jainav.caddy docker/edge/edge.env.example jainav:incoming/
```

1. Pull the pinned Caddy image, the `CADDY_IMAGE` of `/etc/apps/edge.conf` (tag and digest, as in
   `docker/host/apps/edge.conf`):
   `sudo docker pull "$(sed -n 's/^CADDY_IMAGE=//p' /etc/apps/edge.conf)"`. This command and the
   ones in step 3 read the image from the conf, so they follow a Caddy upgrade
   ([edge.md §5](edge.md#5-adding-an-app)). Pulled by digest, the image gets no tag; Compose and
   `app-apply` find it by the digest. Without the pull, `app-apply` pulls the image on its own,
   and a failed pull shows up as "caddy validate failed".
2. The ranges file, **before any other `app-apply edge` command**. `install.sh` put the first
   `Caddyfile` and `snippets.caddy` into `/srv/edge/config/`, because every `app-apply edge`
   command validates the whole tree, and the `Caddyfile` imports `cloudflare-ranges.caddy`, which
   only `cf-ranges apply` writes:

   ```bash
   sudo cf-ranges apply
   sudo cf-ranges verify && echo ok
   ```

   It says that `edge-caddy-1` is not running yet, prints
   "installed /srv/edge/config/cloudflare-ranges.caddy" and the number of ranges, and `verify`
   ends with `ok`. Later changes to the `Caddyfile` or `snippets.caddy` go through
   `sudo app-apply edge config <file>`.

3. `edge.env`, with the staging basic-auth hash. The password is the part after `jainav:` in the
   GitHub secret `SMOKE_BASIC_AUTH` ([§4](#4-github-setup-once)): the smoke tests split it at the
   first colon. Paste this line alone:

   ```bash
   IFS= read -rsp 'Staging basic-auth password: ' P; echo; H=$(printf '%s\n' "$P" | sudo docker run --rm -i --network none --log-driver none "$(sed -n 's/^CADDY_IMAGE=//p' /etc/apps/edge.conf)" caddy hash-password --algorithm bcrypt); unset P; printf '%s\n' "$H" | awk 'NR==FNR {h=$0; next} /^JAINAV_STAGING_AUTH_HASH=/ {$0="JAINAV_STAGING_AUTH_HASH=\047" h "\047"} {print}' - ~/incoming/edge.env.example > ~/incoming/edge.env; unset H; awk -F= '$1=="JAINAV_STAGING_AUTH_HASH" {print length($2)}' ~/incoming/edge.env
   ```

   The last command must print `62`: a 60-character bcrypt hash and its two single quotes. `2`
   means no hash and `19` the example's placeholder: then don't install, and run the line again.
   The password goes to Caddy on stdin, so it is on no command line, and `--log-driver none` keeps
   the hash out of the journal, where Docker sends every container's output. If the second run
   prints `2` too (the line relies on Caddy reading the password from stdin when it has no
   terminal), run
   `sudo docker run --rm -it --log-driver none "$(sed -n 's/^CADDY_IMAGE=//p' /etc/apps/edge.conf)" caddy hash-password --algorithm bcrypt`,
   type the password at its prompts, and paste the hash between the single quotes of
   `JAINAV_STAGING_AUTH_HASH` in `sudoedit /srv/edge/edge.env`, in place of the placeholder. Keep
   the single quotes (the hash holds `$` signs); the user stays `jainav` and `JAINAV_DOMAIN` stays
   `jainavinfotech.in`. In that case skip the install line below: run `rm ~/incoming/edge.env` and
   the check line only. Otherwise install the file and check it:

   ```bash
   sudo app-apply edge env ~/incoming/edge.env && rm ~/incoming/edge.env
   sudo stat -c '%U:%G %a' /srv/edge/edge.env; sudo grep -c replace-me /srv/edge/edge.env
   ```

   The install prints "installed /srv/edge/edge.env" and advice to recreate Caddy, which you can
   ignore: no container exists yet. The check prints `root:root 600` and `0`. `app-apply edge env`
   refuses a `JAINAV_STAGING_AUTH_HASH` that is not a bcrypt hash (the example's placeholder
   `$2a$14$replace-me`, a hash cut short) and names it. It can't tell whether the hash belongs to
   the password: the login test in step 7 proves that. The `sudoedit` route skips that check;
   there `sudo app-apply edge validate` (step 7's last line) warns while the file holds no bcrypt
   hash. Keep the password in the password manager: the edge has no settings archive
   ([backups.md](backups.md)), and GitHub never shows a secret again. If it is lost, choose a new
   one and set `SMOKE_BASIC_AUTH` to `jainav:<new>`. Later changes go through the same
   `app-apply edge env` and a recreate.

4. The Origin CA certificate for `jainavinfotech.in` and `*.jainavinfotech.in`: make it and
   install it as in [edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls), with
   the CA certificate of Jainav's origin pulls, from the password manager, as the fourth
   argument, and the client certificate from the same entry beside it. Put both in
   `~/incoming/` (`cat > ~/incoming/aop-ca.pem`, paste, Enter, Ctrl-D; the same for
   `aop-client.pem`), then:

   ```bash
   sudo app-apply edge cert jainav ~/csr/origin.pem ~/csr/origin-key.pem ~/incoming/aop-ca.pem && shred -u ~/csr/origin-key.pem && rm -r ~/csr
   sudo install -m 0644 -o root -g root ~/incoming/aop-client.pem /srv/edge/certs/jainav/ && rm ~/incoming/aop-ca.pem ~/incoming/aop-client.pem
   ```

   Cloudflare keeps presenting that client certificate, so nothing changes there.

5. The site file, then the compose file:

   ```bash
   sudo app-apply jainav site ~/incoming/jainav.caddy
   sudo app-apply edge compose ~/incoming/compose.yml
   ```

   The site file's check loads the certificate and `aop-ca.pem`, so it needs step 4. The compose
   step prints the steady memory limits, creates the four internal edge networks and pins the
   file's sha256.
   Ignore its "between 01:00 and 07:00 IST" line: nothing is served yet.

6. Start Caddy:

   ```bash
   sudo app-compose edge up -d
   sudo app-compose edge ps
   ```

   `edge-caddy-1` is Up and turns (healthy) within about a minute. `ss` shows no 443 listener:
   published ports are iptables rules on this host. Caddy's journal
   (`journalctl CONTAINER_NAME=edge-caddy-1 -n 20 -o cat --no-pager`) shows no errors; its
   "Unnecessary header_up X-Forwarded-Host" warning is expected
   ([edge.md §2](edge.md#2-site-files-and-their-checks)).

7. Checks that need no DNS, on the server. Every site asks for the zone's client certificate,
   which only Cloudflare presents
   ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)), so from here Caddy
   answers no request. Each host must refuse one:

   ```bash
   for h in www.jainavinfotech.in staging.jainavinfotech.in; do
     e=$(curl -sSk -o /dev/null --max-time 5 --resolve "$h:443:127.0.0.1" "https://$h/" 2>&1); echo "$h exit $? ${e##*::}"
   done
   ```

   Each line shows an exit status other than 0 and `alert certificate required` (with Ubuntu
   24.04's curl, `exit 56 tlsv13 alert certificate required, errno 0`): Caddy answers and asks
   for the certificate ([edge.md §6](edge.md#6-the-leak-test), step 4). An `exit 55` line with
   `Connection reset by peer`, `Broken pipe` or `getpeername() failed with errno 107` is the same
   refusal: run the loop again.
   Then `sudo app-apply edge validate` prints "the live edge tree is valid" and nothing after it. A
   line `warning: JAINAV_STAGING_AUTH_HASH holds no bcrypt hash` means `/srv/edge/edge.env`
   still has the placeholder or a hash cut short: make the hash again (step 3).

   The answers themselves come through Cloudflare, from your machine, once the DNS records point
   at this server ([launch.md](launch.md), or step 9 of
   [backups.md](backups.md#disaster-recovery-on-a-new-server)): `https://staging.jainavinfotech.in/`
   answers `401`, and `https://www.jainavinfotech.in/x` answers `308` to
   `https://jainavinfotech.in/x` once `www` has its record. Then the login test, in Git Bash,
   pasted alone:

   ```bash
   IFS= read -rsp 'Staging password: ' P; echo; printf 'user = "jainav:%s"\n' "$P" | curl -s -o /dev/null -w '%{http_code}\n' --max-time 40 --config - https://staging.jainavinfotech.in/; unset P
   ```

   `401` means the hash and the password differ; anything else means the login was accepted
   (`502` after about 30 s while no staging app runs behind it). A password with `"` or `\` needs
   escaping in curl's config syntax.

**Jainav**, as `ops`. What its files hold:

- `.env`: the values `docker/compose.prod.yml` reads; `docker/env.example` lists them.
  - `BACKUP_AGE_RECIPIENT` comes from the backup key: make it first
    ([backups.md](backups.md#the-key)). It is the same key as `BACKUP_RECIPIENT` in
    `/etc/apps/jainav.conf`. Compose checks every required value on every command, so nothing
    starts without it.
- `production.env` and `staging.env`: the apps' settings.
  - `NODE_ENV=production`, `NEXT_PUBLIC_SITE_URL` (`https://jainavinfotech.in` /
    `https://staging.jainavinfotech.in`), `PAYLOAD_SECRET`.
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
- Env-file lines may not start with `COMPOSE_`.

The steps below write them on the server. Copy the files first, from the repository root on your
machine (`docker/env.example` only documents names and is not copied):

```bash
scp docker/compose.prod.yml docker/images.env.example docker/postgres/roles.sh jainav:incoming/
```

1. The backup key's public half goes into the conf first. It is public, so the prompt shows it:

   ```bash
   read -rp 'Backup age public key (age1...): ' K; [[ $K =~ ^age1[0-9a-z]+$ ]] && sudo sed -i "s|^BACKUP_RECIPIENT=.*|BACKUP_RECIPIENT=$K|" /etc/apps/jainav.conf; unset K
   grep '^BACKUP_RECIPIENT=' /etc/apps/jainav.conf; stat -c '%U:%G %a' /etc/apps/jainav.conf
   ```

   The second line shows the key and `root:root 644`.

2. The files and directories. These lines read nothing, so they may be pasted together:

   ```bash
   sudo test -e /srv/jainav/.env || sudo install -m 600 -o root -g root /dev/null /srv/jainav/.env
   sudo test -e /srv/jainav/production.env || sudo install -m 600 -o root -g root /dev/null /srv/jainav/production.env
   sudo test -e /srv/jainav/staging.env || sudo install -m 600 -o root -g root /dev/null /srv/jainav/staging.env
   sudo test -e /srv/jainav/images.env || sudo install -m 644 -o root -g root ~/incoming/images.env.example /srv/jainav/images.env
   sudo install -d -m 755 -o root -g root /srv/jainav/postgres
   sudo install -m 755 -o root -g root ~/incoming/roles.sh /srv/jainav/postgres/roles.sh
   ```

   `images.env` names the image each service runs, including the tools image of each environment
   (`TOOLS_IMAGE`, `TOOLS_STAGING_IMAGE`); `app-deploy` rewrites a line after each deploy. On a
   server that already has the file, add the two `TOOLS_*` lines.

3. Generated values: nothing is shown or typed. The block checks first, so a second paste writes
   nothing:

   ```bash
   if sudo grep -q '^POSTGRES_PASSWORD=' /srv/jainav/.env; then echo 'already ran: nothing written'; else
   for k in POSTGRES_PASSWORD UMAMI_DB_PASSWORD UMAMI_APP_SECRET; do printf '%s=%s\n' "$k" "$(openssl rand -base64 32 | tr -d '/+=')"; done | sudo tee -a /srv/jainav/.env >/dev/null
   P=$(openssl rand -base64 32 | tr -d '/+='); printf 'APP_DB_PASSWORD=%s\n' "$P" | sudo tee -a /srv/jainav/.env >/dev/null; printf 'DATABASE_URL=postgres://jainav:%s@postgres:5432/jainav\n' "$P" | sudo tee -a /srv/jainav/production.env >/dev/null; unset P
   P=$(openssl rand -base64 32 | tr -d '/+='); printf 'STAGING_DB_PASSWORD=%s\n' "$P" | sudo tee -a /srv/jainav/.env >/dev/null; printf 'DATABASE_URL=postgres://jainav_staging:%s@postgres:5432/jainav_staging\n' "$P" | sudo tee -a /srv/jainav/staging.env >/dev/null; unset P
   for f in production staging; do { printf 'PAYLOAD_SECRET=%s\n' "$(openssl rand -base64 32 | tr -d '/+=')"; printf 'OTP_PEPPER=%s\n' "$(openssl rand -hex 32)"; } | sudo tee -a "/srv/jainav/$f.env" >/dev/null; done
   echo ok; fi
   ```

   The generator, `openssl rand -base64 32 | tr -d '/+='`, gives letters and digits only, safe
   unquoted and inside the database URLs. Role and database names are those of
   `postgres/roles.sh`.

4. Public values. Paste each `read` line alone. The account ID builds the R2 endpoint, and the chat
   ID is the Telegram group's (a negative number):

   ```bash
   if sudo grep -q '^BACKUP_S3_ENDPOINT=' /srv/jainav/.env; then echo 'already set: nothing written'; else read -rp 'Cloudflare account ID (32 hex): ' A; if [[ $A =~ ^[0-9a-f]{32}$ ]]; then printf 'BACKUP_S3_ENDPOINT=https://%s.r2.cloudflarestorage.com\n' "$A" | sudo tee -a /srv/jainav/.env >/dev/null && printf 'S3_ENDPOINT=https://%s.r2.cloudflarestorage.com\n' "$A" | sudo tee -a /srv/jainav/production.env /srv/jainav/staging.env >/dev/null && echo ok; else echo 'not 32 hex: nothing written'; fi; unset A; fi
   ```

   ```bash
   if sudo grep -q '^TELEGRAM_CHAT_ID=' /srv/jainav/.env; then echo 'already set: nothing written'; else read -rp 'Telegram group chat id (negative): ' C; if [[ $C =~ ^-[0-9]+$ ]]; then printf 'TELEGRAM_CHAT_ID=%s\n' "$C" | sudo tee -a /srv/jainav/.env /srv/jainav/production.env /srv/jainav/staging.env >/dev/null && echo ok; else echo 'not a negative number: nothing written'; fi; unset C; fi
   ```

   Then the fixed values, which read nothing. Buckets and hostnames are those of
   [cloudflare.md](cloudflare.md#r2); URLs take no trailing slash, `DOWNLOADS_BASE_URL` is an
   origin only, and `EMAIL_REPLY_TO` must be a real inbox ([cloudflare.md](cloudflare.md#email)):

   ```bash
   K=$(sed -n 's/^BACKUP_RECIPIENT=//p' /etc/apps/jainav.conf); if sudo grep -q '^BACKUP_AGE_RECIPIENT=' /srv/jainav/.env; then echo '.env already has the backup values: nothing written'; elif [[ $K =~ ^age1[0-9a-z]+$ ]]; then printf 'BACKUP_AGE_RECIPIENT=%s\nBACKUP_BUCKET=jainav-backups\n' "$K" | sudo tee -a /srv/jainav/.env >/dev/null && echo ok; else echo 'BACKUP_RECIPIENT is not set: do step 1 first'; fi; unset K
   if sudo grep -q '^NODE_ENV=' /srv/jainav/production.env; then echo 'production.env already has the fixed values: nothing written'; else printf '%s\n' NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://jainavinfotech.in S3_REGION=auto S3_BUCKET=jainav-public S3_PRIVATE_BUCKET=jainav-private NEXT_PUBLIC_CDN_URL=https://cdn.jainavinfotech.in DOWNLOADS_BASE_URL=https://downloads.jainavinfotech.in EMAIL_FROM=hello@send.jainavinfotech.in EMAIL_REPLY_TO=support@jainavinfotech.in | sudo tee -a /srv/jainav/production.env >/dev/null && echo ok; fi
   if sudo grep -q '^NODE_ENV=' /srv/jainav/staging.env; then echo 'staging.env already has the fixed values: nothing written'; else printf '%s\n' NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://staging.jainavinfotech.in STAGING_BASIC_AUTH=1 ENABLE_STYLEGUIDE=1 S3_REGION=auto S3_BUCKET=jainav-staging-public S3_PRIVATE_BUCKET=jainav-staging-private NEXT_PUBLIC_CDN_URL=https://cdn-staging.jainavinfotech.in DOWNLOADS_BASE_URL=https://cdn-staging.jainavinfotech.in EMAIL_FROM=hello@send.jainavinfotech.in EMAIL_REPLY_TO=support@jainavinfotech.in | sudo tee -a /srv/jainav/staging.env >/dev/null && echo ok; fi
   ```

5. Secrets, at hidden prompts, one line at a time:

   ```bash
   addenv BACKUP_S3_ACCESS_KEY_ID /srv/jainav/.env
   addenv BACKUP_S3_SECRET_ACCESS_KEY /srv/jainav/.env
   addenv BACKUP_HEARTBEAT_URL /srv/jainav/.env
   addenv TELEGRAM_BOT_TOKEN /srv/jainav/.env /srv/jainav/production.env /srv/jainav/staging.env
   addenv S3_ACCESS_KEY_ID /srv/jainav/production.env
   addenv S3_SECRET_ACCESS_KEY /srv/jainav/production.env
   addenv S3_ACCESS_KEY_ID /srv/jainav/staging.env
   addenv S3_SECRET_ACCESS_KEY /srv/jainav/staging.env
   addenv TURNSTILE_SECRET_KEY /srv/jainav/production.env /srv/jainav/staging.env
   addenv SENTRY_DSN /srv/jainav/production.env /srv/jainav/staging.env
   addenv RESEND_API_KEY /srv/jainav/production.env /srv/jainav/staging.env
   ```

   `BACKUP_S3_*` are the Access Key ID and Secret Access Key of the backups R2 token, and `S3_*`
   those of the app token of that environment ([cloudflare.md](cloudflare.md#r2)).
   `TELEGRAM_BOT_TOKEN` is the site's bot, `BACKUP_HEARTBEAT_URL` the backup monitor's ping URL
   ([monitoring.md](monitoring.md)) and `SENTRY_DSN` the Sentry project's DSN. One Turnstile
   widget serves both hostnames, so both files get its secret. `RESEND_API_KEY` can wait (above).
   The licensing sets and the Razorpay test keys come later; no recreate is needed until the apps
   run.

6. `/etc/hostwatch.env`, for the server's own alerts: the server bot's token, the chat ID and the
   hostwatch monitor's ping URL ([monitoring.md](monitoring.md#hostwatch)). `app-deploy` and the
   settings archive alert only through `hostwatch`, which without a token writes to the journal
   alone, so fill it before §3. `install.sh` left the example there, with empty `BOT_TOKEN=`,
   `CHAT_ID=` and `HEARTBEAT_URL=` lines, and `addenv` refuses a name that is already there: the
   first line starts the file empty while it holds no value, and the second copies the chat ID
   from `.env` (the same group) without showing it.

   ```bash
   sudo grep -qE '^[A-Z_]+=.' /etc/hostwatch.env || sudo install -m 600 -o root -g root /dev/null /etc/hostwatch.env
   C=$(sudo sed -n 's/^TELEGRAM_CHAT_ID=//p' /srv/jainav/.env); if sudo grep -q '^CHAT_ID=.' /etc/hostwatch.env; then echo 'CHAT_ID already set'; elif [[ $C =~ ^-[0-9]+$ ]]; then printf 'CHAT_ID=%s\n' "$C" | sudo tee -a /etc/hostwatch.env >/dev/null && echo ok; else echo 'no single TELEGRAM_CHAT_ID in .env: nothing written'; fi; unset C
   addenv BOT_TOKEN /etc/hostwatch.env
   addenv HEARTBEAT_URL /etc/hostwatch.env
   ```

   Paste each `addenv` line alone. Then test the alerts:
   `sudo hostwatch alert 'test from the new server'` prints "hostwatch: sent", and the group gets
   "[server] test from the new server". If it isn't sent,
   `journalctl -t hostwatch -n 5 -o cat --no-pager` says why. Both bots must be members of the
   group.

7. Check the files without showing a value:

   ```bash
   for f in /srv/jainav/.env /srv/jainav/production.env /srv/jainav/staging.env /etc/hostwatch.env; do printf '%s: ' "${f##*/}"; sudo awk '/^[A-Za-z_][A-Za-z0-9_]*=/ {i = index($0, "="); k = substr($0, 1, i - 1); n[k]++; printf "%s(%d) ", k, length($0) - i} END {for (k in n) if (n[k] > 1) printf "TWICE:%s ", k; print ""}' "$f"; done
   sudo stat -c '%n %U:%G %a' /srv/jainav/.env /srv/jainav/production.env /srv/jainav/staging.env /srv/jainav/images.env /srv/jainav/postgres/roles.sh /etc/hostwatch.env
   ```

   It prints each name with the length of its value: `(0)` is an empty value, and `TWICE:NAME` a
   name set twice. `.env` must list 13 names and `hostwatch.env` 3, and no file may show `(0)` or
   `TWICE`. The modes must be 600, 600, 600, 644, 755 and 600. Remove a duplicate with
   `sudo sed -i '/^NAME=/d' <file>`, then run `addenv` again. Never print a value: check a file
   with `grep -q` or `grep -c`, or with this command.

8. The compose file:

   ```bash
   sudo app-apply jainav compose ~/incoming/compose.prod.yml
   ```

   It refuses a file that could reach the host or another app; it also needs the env files and
   `roles.sh` to exist, and Compose names any required value that is missing (nothing is installed
   then). It prints the steady memory limits and
   "installed /srv/jainav/compose.prod.yml; its sha256 is pinned …", and creates `backup-out`.
   Ignore its "next: …" line: §3 names the services. The backup service gets its image from
   `app-deploy` (§3).

## 3. First start

Run it in an interactive session as in §2, and close that session afterwards if a secret was
printed. The edge is already running. Always name the services: a bare `up -d` would also try the
apps and the backup job, whose images stay `:none` until their first deploy.

```bash
sudo app-compose jainav up -d postgres
timeout 180 bash -c 'until journalctl CONTAINER_NAME=jainav-postgres-1 --since -10min -o cat --no-pager | grep -q "PostgreSQL init process complete"; do sleep 3; done' && echo 'init done' || echo 'no init line after 3 minutes'
```

The second line waits until Postgres has finished its first initialisation. If it prints
"no init line after 3 minutes", stop and read
`journalctl CONTAINER_NAME=jainav-postgres-1 -n 30 -o cat --no-pager`. Otherwise start Umami:

```bash
sudo app-compose jainav up -d umami
sudo app-compose jainav ps   # postgres healthy; umami "health: starting" for up to about a minute, then healthy
sudo app-compose jainav exec -T postgres psql -U postgres -Atc "select datname from pg_database where datname in ('jainav','jainav_staging','umami') order by 1"
```

The last line prints the three databases. `postgres/roles.sh` creates the roles and databases the
first time the volume is created. Every command through `app-compose` uses the project `jainav`
and the files named in `/etc/apps/jainav.conf`.

The volume is initialised only once: if the first start fails, or ran with a wrong `.env`, a fix
to `.env` changes nothing in the database. Start over, **only while the database is still
empty**:

```bash
sudo app-compose jainav down
sudo docker volume rm jainav_pgdata
```

`jainav_pgdata` is the volume `pgdata` of the Compose project `jainav`. Then fix the env file and
start again. Never do this once the apps have written data: it deletes every database.

**Umami's password, before any DNS record.** Umami starts with the login `admin` / `umami`, and
the proxied `analytics` record would make its login page public. Change the password over a port
forward while no record exists:

1. On the server, once `jainav-umami-1` is (healthy), print its address on the project's own
   network:

   ```bash
   sudo docker inspect -f '{{with index .NetworkSettings.Networks "jainav_default"}}{{.IPAddress}}{{end}}' jainav-umami-1
   ```

2. On your machine, in a second terminal, with that address in place of `<address>` (`ops` may
   forward local ports):

   ```bash
   ssh -N -L 3001:<address>:3000 jainav
   ```

3. Open `http://localhost:3001` and sign in as `admin` / `umami`. Change the password and keep it
   in the password manager. The website for `jainavinfotech.in` can be added now too
   ([monitoring.md](monitoring.md#umami-analytics)).
4. Press Ctrl-C in the second terminal to close the forward.

The `analytics` DNS record comes only after this ([launch.md](launch.md) step 4).

**The backup job's image** comes from CI too: the `Backup image` workflow builds
`backup-<commit>`, and its run summary shows `backup-<40 hex>@sha256:<64 hex>`. The tag carries
the full 40-character commit. Deploy it once by hand, pasting each line alone:

```bash
read -rp 'Backup image (backup-<commit>@sha256:<digest>): ' REF
read -rsp 'Registry token, read:packages: ' PAT; echo; printf '%s\n' "$PAT" | sudo app-deploy jainav backup "$REF"; unset PAT
```

If the package is public, it needs no token: `sudo app-deploy jainav backup "$REF"`. It prints
"deploying … to backup (jainav backup)", "switching backup to …" and
"backup is running backup-<commit>". A failed first deploy stops the service: there is no
earlier image to go back to. Then `sudo app-compose jainav ps backup` shows it Up, and
`sudo tail -n 1 /srv/jainav/deploys.log` shows the deploy. When a token was given,
`journalctl -t app-deploy` holds Docker's "credentials are stored unencrypted" warning, which is
expected ([§5](#5-deploy)).

Then the settings archive. It comes after the deploy, so that `deploys.log` exists; otherwise it
alerts that it archived without it:

```bash
sudo systemctl enable --now app-config-archive@jainav.timer
sudo systemctl start app-config-archive@jainav.service
sudo ls -l /srv/jainav/backup-out
```

The listing shows a `config-<stamp>.tar.age` (0644).

The apps start with the first deploy (§5). Their healthcheck calls `/api/v1/health`, which
initializes Payload, and Payload applies the migrations (`prodMigrations`).

Check, before the other timers:

- `sudo hostwatch check` ends with "hostwatch check: clean". It never reads `/etc/hostwatch.env`,
  so it doesn't prove that alerts arrive: the alert test of §2 does;
- `journalctl COM_DOCKER_COMPOSE_PROJECT=jainav -n 5` shows lines;
- `sudo systemctl restart docker` keeps 443 answering. Start this loop, and run the restart in a
  second session while it runs:

  ```bash
  for i in $(seq 40); do curl -sk -o /dev/null --max-time 2 --resolve www.jainavinfotech.in:443:127.0.0.1 https://www.jainavinfotech.in/; printf '%s ' "$?"; sleep 1; done; echo
  ```

  It prints `56` throughout (a `55` now and then is the same refusal, met while curl was still
  sending): each second Caddy answered and asked for the client certificate of origin pulls, as
  in step 7 of §2. A `7` or a `28` means 443 stopped answering, and a `0` that it took a client
  without the certificate. Afterwards:
  `sudo app-compose edge ps; sudo app-compose jainav ps; sudo cf-ranges verify && echo ok`;

- the straight-to-the-origin step of the leak test times out
  ([edge.md §6](edge.md#6-the-leak-test), step 3). From your own machine, with the server's
  address:

  ```bash
  curl -4 -k --max-time 5 -o /dev/null -w '%{http_code}\n' https://<server-ip>/ ; echo "exit $?"
  ```

  It prints `000` and `exit 28`. Add a temporary hPanel accept rule for your own address and run
  it again: it must still time out, because the host's `DOCKER-USER` rules are a layer of their
  own. Remove the rule afterwards. The other steps need DNS or authenticated origin pulls
  ([launch.md](launch.md));

- `/etc/hostwatch.env` is filled in (§2): `stat -c '%U:%G %a' /etc/hostwatch.env` prints
  `root:root 600`.

Then enable the other timers and check them as in §1 step 15; the archive timer is already on.

**Gates.** Authenticated origin pulls are on for the site's zone, and tested, before the first
production deploy, and on for every zone before the first container of a second app runs on the
server ([edge.md §3](edge.md#3-certificates-and-authenticated-origin-pulls)). Cloudflare Access on
`/admin`, `/admin/*`, `/api/users` and `/api/users/*`, on the apex and on staging, is in place
before the site's DNS records ([launch.md](launch.md#gates-before-the-first-production-deploy)).

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
- **By hand (admin form):** in an interactive `ssh jainav` session (the prompt starts `ops@`),
  after `sudo -v`, pasting each line alone. The registry token is read at a hidden prompt and goes
  to `app-deploy` on stdin, never on the command line. Don't run it as
  `ssh jainav sudo app-deploy …`: sudo has no terminal there to ask for the password, and
  `ssh -t` makes stdin a terminal, so `app-deploy` would read no token.

  ```bash
  read -rp 'Image (prod-v1.0.0@sha256:<digest>): ' REF
  read -rp 'Tools image (tools-<commit>@sha256:<digest>): ' TOOLS
  read -rsp 'Registry token, read:packages: ' PAT; echo; printf '%s\n' "$PAT" | sudo app-deploy jainav production "$REF" "$TOOLS"; unset PAT
  ```

  A bare tag is accepted too; `app-deploy` records the digest it resolved. A tools tag carries the
  full 40-character commit. Images already on the server need no token:
  `sudo app-deploy jainav production "$REF" "$TOOLS"`.

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
  - Each deploy that logs in to the registry (every CI deploy does) leaves Docker's
    "credentials are stored unencrypted" warning in `journalctl -t app-deploy`. It is expected:
    the login lives in a Docker config of the deploy's own under `/run`, removed when it ends.
- Migrations run when the new container starts. Keep them backward-compatible for one release
  (add columns before using them, drop them a release later), so a rollback still works.

## 6. Roll back

In an interactive `ssh jainav` session, as in §5 (`ops` reads `deploys.log` only with sudo):

```bash
sudo tail -n 5 /srv/jainav/deploys.log     # find the previous image
read -rp 'Previous image (prod-v1.0.0@sha256:<digest>): ' REF
sudo app-deploy jainav production "$REF"
```

The previous image is still on the server, so it needs no token. For an older one, redeploy its
tag with §5's token form; the token pulls it. A rollback does not undo migrations: keep them
backward-compatible (§5).

## 7. Change the server setup

Deploys only replace the app images. Everything else goes through `app-apply`, from
`/home/ops/incoming`:

- **Compose file** (`compose.prod.yml`, the edge's `compose.yml`): `sudo app-apply jainav compose
~/incoming/compose.prod.yml`. It checks the file (no privileged mode, host paths, ports, device access;
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
- **Env files:** edit them with `sudoedit <file>`, or replace a value on the server:
  `sudo sed -i '/^NAME=/d' <file>`, then `addenv NAME <file>` (§2). Then recreate the service that
  reads them. `images.env` is written by `app-deploy`; never edit it while a deploy runs.
- **Host scripts and settings:** bring a new kit with the same `host/`, `edge/` and `keys/` as
  §1 step 7. Keep every key file in `keys/`: `install.sh` rewrites each deploy user's keys from
  the kit, so a key file left out revokes that key. After hardening root has no SSH, so copy the
  kit as `ops` and install it with `sudo`. On the PC, make a new folder named `keys` next to the
  repository's folder and copy only the `.pub` files into it (never a private key). Then, from the
  repository root (the relative path works in PowerShell and in Git Bash):

  ```bash
  ssh jainav 'rm -rf ~/kit && mkdir ~/kit'
  scp -r docker/host docker/edge ../keys jainav:kit/
  ```

  Then on the server:

  ```bash
  sudo rm -rf /root/kit && sudo cp -r ~/kit /root/kit && sudo chown -R root:root /root/kit
  sudo bash /root/kit/host/install.sh --harden && rm -rf ~/kit
  ```

  `--harden` keeps the hardening file in step with the kit; sshd restarts only if something
  changed. `install.sh` rewrites only what differs, and never overwrites `/etc/apps/*.conf`,
  `edge.env` or `hostwatch.env`.

- `postgres/roles.sh` only runs on an empty volume: add a database later with `psql` instead.

A recreate costs a few seconds of downtime for that service; Postgres is not recreated by a
deploy. Recreating Postgres ends every open connection: each site container logs
`postgres: an idle connection closed` once for each connection it used in the 10 seconds before
(usually one, sometimes none), and its next query connects again.

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
- `sudo hostwatch check` (`tests/host/hostwatch.sh` covers how it sends, repeats and resolves
  alerts), and the leak test ([edge.md §6](edge.md#6-the-leak-test)).

For a rehearsal of the apps on Docker Desktop (port 8443, self-signed certificates, a local
folder for the backup bucket), add `docker/compose.local.yml` as a second `-f` file: it switches
every service to the `json-file` log driver, because the production file's `journald` driver does
not exist there. The SSH tunnel and the GitHub side can only be checked against the real
accounts.
