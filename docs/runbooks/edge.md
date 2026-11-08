# The edge: Caddy, certificates and the origin firewall

One Caddy serves every site on the server, and only Cloudflare may reach it. It is a Compose
project of its own (`docker/edge/`, files in `/srv/edge`), so a site change never touches an
app's stack. The server as a whole: [server.md](server.md). Cloudflare's side:
[cloudflare.md](cloudflare.md).

Everything here is done as the `ops` user with `sudo`. Root's scripts check each file before
they install it, so a wrong file is refused and the running config stays as it was.

## 1. How the edge works

- The project is `edge`; its container is `edge-caddy-1`. It publishes one port, **443/tcp**.
  Port 80 is closed: Cloudflare connects over HTTPS, and the zones keep Always Use HTTPS on.
- Every app has its own **internal** Docker networks: `edge-<app>` and `edge-<app>-staging`.
  Each holds only Caddy and that app's own services, so one app can't reach another's
  containers. Caddy joins all of them; the list is `EDGE_NETWORKS` in `/etc/apps/edge.conf`.
  `app-apply` creates a missing one (`docker network create --internal`) and refuses one that
  exists but is not internal.
- **The visitor's address comes from Cloudflare only.** Caddy trusts `CF-Connecting-IP` from
  Cloudflare's ranges (`cloudflare-ranges.caddy`) and from nobody else. The `upstream` snippet
  then sets `X-Real-IP`, `X-Forwarded-For`, `CF-Connecting-IP` and `Sb-Forwarded-For` to that
  one address, fixes `X-Forwarded-Proto` and `X-Forwarded-Port`, and removes `True-Client-IP`,
  `X-Client-IP` and `Forwarded`. An app never sees a value a client made up.
- **Four layers keep everyone but Cloudflare out.** Each one stands on its own:
  1. Hostinger's firewall in hPanel: 443 from Cloudflare's ranges only.
  2. The host's `DOCKER-USER` rules (`CF-INBOUND`): the same ranges, which Docker's own port
     publishing does not bypass ([§4](#4-cloudflares-ranges-and-the-origin-firewall)).
  3. Caddy's trusted proxies: only Cloudflare's ranges may set the client address.
  4. Authenticated origin pulls: Caddy accepts a connection only with a client certificate from
     our own CA, which Cloudflare presents ([§3](#3-certificates-and-authenticated-origin-pulls)).
- **Files on the server**, in `/srv/edge`:

  | Path                                 | What                                                                        |
  | ------------------------------------ | --------------------------------------------------------------------------- |
  | `compose.yml`                        | the edge project                                                            |
  | `edge.env` (0600)                    | the values the site files read as `{$JAINAV_…}`                             |
  | `config/Caddyfile`, `snippets.caddy` | global options and the shared snippets (the admin's own)                    |
  | `config/cloudflare-ranges.caddy`     | the trusted proxies, written by `cf-ranges apply`                           |
  | `config/sites/<app>.caddy`           | each app's site file                                                        |
  | `config/log-redact.d/<app>.caddy`    | an app's log redaction, server only ([§7](#7-log-redaction-for-other-apps)) |
  | `certs/<app>/`                       | `origin.pem`, `origin-key.pem` (0600), `aop-ca.pem`                         |

- Log lines hold the time, method, host, path, status, size and duration, and Cloudflare's
  address. They hold no visitor address, no headers and no query string.
- `app-compose edge <compose args>` runs Compose for the edge, for example
  `sudo app-compose edge ps` and `sudo app-compose edge up -d`.

## 2. Site files and their checks

Each app keeps its site file in its own repository. The admin copies it to `~/incoming/` on the
server and installs it:

```bash
sudo app-apply <app> site ~/incoming/<app>.caddy
```

Deploys never install site files: a deploy key can only run `app-deploy`, and `app-deploy`
writes nothing under `/srv/edge`.

`app-apply` checks the file in three steps and lists every problem it finds in one run:

1. **The raw text.** Only `https://` site blocks, and only the directives on its allow-list.
   `{$NAME}` placeholders must name values in `edge.env`.
2. **The adapted JSON** (what Caddy would really do). Hosts stay inside the app's zone
   (`ZONE` in its conf), upstreams are the app's `UPSTREAMS`, TLS files come from
   `/certs/<app>/`, and the handlers come from an allow-list. A site file may import only
   `site_common`, its own `tls_<app>` and `upstream`.
3. **Caddy's own validate** of the whole tree, with the pinned image and the real certificates.

Then it installs the file (0644), keeps the old one under `/var/lib/app-apply/`, and reloads
Caddy. If the reload fails, the old file goes back.

Other edge commands:

```bash
sudo app-apply edge config ~/incoming/Caddyfile        # Caddyfile or snippets.caddy; sites and log-redact.d stay
sudo app-apply edge env ~/incoming/edge.env            # then recreate Caddy
sudo app-apply edge validate                           # checks the live tree (hostwatch runs it daily)
sudo app-apply edge reload                             # validate, then reload
```

Every one of them validates the whole tree, so on a new server `install.sh` puts the first
`Caddyfile` and `snippets.caddy` in place, the admin fills in `edge.env` by hand, and then
`sudo cf-ranges apply` writes the ranges file ([server.md §2](server.md#2-put-the-files-in-place)).

`edge.env` is read when the container is **created**, not on a reload. After
`app-apply edge env`, recreate Caddy: `sudo app-compose edge up -d`. Until then every other
`app-apply` command for the edge refuses with "recreate Caddy first". Every name in `edge.env`
must start with the `ENV_PREFIX` of an app that has a conf in `/etc/apps/` (`JAINAV_` for
this site), and every value must be set.

## 3. Certificates and authenticated origin pulls

### Origin certificate for a zone

Each zone has one Cloudflare Origin CA certificate for the zone and `*.<zone>`, made from a CSR
generated on the server, so the private key never leaves it.

1. On the server, in a directory only you can read:

   ```bash
   umask 077 && mkdir ~/csr && cd ~/csr
   openssl req -new -newkey rsa:2048 -nodes -keyout origin-key.pem -out origin.csr \
     -subj '/CN={{DOMAIN}}' -addext 'subjectAltName=DNS:{{DOMAIN}},DNS:*.{{DOMAIN}}'
   cat origin.csr
   ```

2. Cloudflare → the zone → SSL/TLS → Origin Server → Create Certificate → _Use my private key
   and CSR_. Paste `origin.csr`, 15 years. Save the result as `~/csr/origin.pem`.
3. Install the pair (checked, then Caddy reloads):

   ```bash
   sudo app-apply edge cert jainav ~/csr/origin.pem ~/csr/origin-key.pem
   shred -u ~/csr/origin-key.pem && rm -r ~/csr
   ```

   They land in `/srv/edge/certs/jainav/` (`origin.pem` 0644, `origin-key.pem` 0600). Put the
   expiry on a calendar; hostwatch's daily run also warns before it.

### Authenticated origin pulls (a launch gate)

Cloudflare's shared client certificate proves only that a request came from Cloudflare's
network, which every Cloudflare customer shares. So each zone uses a certificate from our own
CA. **It must be on for every zone before a second app's containers run on the server.** It
needs Caddy 2.11.9 or later, which treats conflicting `client_auth` policies as an error
([launch.md](launch.md#gates-before-the-first-production-deploy)).

1. On your machine, make a private CA and one client certificate per zone with `openssl`. The
   CA key goes in the password manager and stays off the server.
2. Cloudflare → the zone → SSL/TLS → Origin Server → Authenticated Origin Pulls → Zone-level:
   upload the client certificate and its key, then turn zone-level origin pulls on.
3. Install the CA certificate on the server. `app-apply edge cert` always takes the Origin CA
   pair too; name the installed one (or the new pair, if it is new):

   ```bash
   sudo app-apply edge cert jainav /srv/edge/certs/jainav/origin.pem \
     /srv/edge/certs/jainav/origin-key.pem ~/incoming/aop-ca.pem
   ```

   The client certificate itself (never its key) may be stored as
   `/srv/edge/certs/jainav/aop-client.pem`
   (`sudo install -m 0644 -o root -g root ~/incoming/aop-client.pem /srv/edge/certs/jainav/`):
   hostwatch's daily check then warns before it expires too.

4. In `snippets.caddy`, remove the comment marks from the `client_auth` block in that app's
   `tls_<app>`, then:

   ```bash
   sudo app-apply edge config ~/incoming/snippets.caddy
   ```

   Order matters: Cloudflare presents the certificate first, then Caddy requires it.

5. Run the origin test of [§6](#6-the-leak-test): a TLS connection straight to the origin
   without a client certificate must be refused.
6. Check that `ssh jainav` and the R2 custom domains (`cdn.`, `downloads.`) still work. Origin
   pulls only affect proxied hostnames that Caddy serves.

Put the client certificate's expiry on the calendar. Replacing it follows the same steps: upload
the new certificate at Cloudflare first, then update `aop-ca.pem` if the CA changed.

## 4. Cloudflare's ranges and the origin firewall

The files `docker/edge/cloudflare-ips-v4.txt` and `-v6.txt` are Cloudflare's published ranges
(public data). `install.sh` copies them to `/etc/cf-ranges/`.

- **`cf-ranges firewall`** loads the `INPUT` and `DOCKER-USER` filters. The `cf-ranges-firewall`
  service runs it at boot, and Docker requires that service, so Docker never starts with the
  gate open. New connections arriving on the public interface reach a container only from a
  Cloudflare range; everything else is dropped, for IPv4 and IPv6. There are no AAAA records,
  so IPv6 carries no site traffic.
- **`cf-ranges apply`** rebuilds the `CF-INBOUND` chain from the lists and refreshes Caddy's
  trusted proxies. The new ranges file goes through `app-apply edge ranges`, so it is checked
  and Caddy reloads; if the filters fail to load, the previous file goes back.
- **`cf-ranges verify`** checks that every rule is in place, in order, and that the saved
  interface exists. hostwatch runs it every 5 minutes and alerts on a failure. With `--gate` it
  checks only that the required rules are present: that is the form Docker's start uses, so a
  stricter check can never keep Docker down.
- **`cf-ranges-check.timer`** runs weekly. It fetches Cloudflare's lists and alerts when they
  differ from the files. It changes nothing by itself, because Hostinger's firewall needs the
  same change by hand.

When the alert says Cloudflare's ranges changed:

1. Update `docker/edge/cloudflare-ips-v4.txt` and `-v6.txt` from <https://www.cloudflare.com/ips-v4>
   and <https://www.cloudflare.com/ips-v6>, and commit them.
2. Change the 443 rules in hPanel's firewall to match.
3. On the server, rerun `install.sh` from the kit (it copies the lists to `/etc/cf-ranges/`),
   then:

   ```bash
   sudo cf-ranges apply
   sudo cf-ranges verify && echo ok
   ```

A `verify` alert means a rule is missing or out of place. Run `sudo cf-ranges firewall`, then
`sudo cf-ranges verify` and `sudo iptables -S DOCKER-USER`, and look at `journalctl -t cf-ranges`.

## 5. Adding an app

1. **The conf.** The admin writes `/etc/apps/<app>.conf` (root, 0644) from the values the app's
   maintainers send; `docker/host/apps/app.conf.example` documents every setting. The ones
   that matter here: `ZONE` (its domain), `UPSTREAMS` (the container names and ports Caddy may
   proxy to), `ENV_PREFIX` (`<APP>_`, for example `MENUMESH_`) and `EDGE_NETWORKS`.
2. **The networks.** `edge-<app>` and `edge-<app>-staging` are already listed in
   `/etc/apps/edge.conf`. `sudo app-apply <app> compose <file>` creates a missing one, as an
   internal network. The app's compose file attaches only its web-facing services to them.
3. **The certificate** for the app's zone: [§3](#3-certificates-and-authenticated-origin-pulls),
   with authenticated origin pulls on before the app's containers run.
4. **`edge.env` names.** Add the app's values to `/srv/edge/edge.env`, every name starting with
   its `ENV_PREFIX`, then install and recreate:

   ```bash
   sudo app-apply edge env ~/incoming/edge.env
   sudo app-compose edge up -d        # recreate: Caddy reads edge.env only at creation
   ```

   The conf must exist before its names go into `edge.env`.

5. **The site file:** `sudo app-apply <app> site ~/incoming/<app>.caddy` ([§2](#2-site-files-and-their-checks)).
   It reloads Caddy; no recreate is needed.
6. If the app's URLs carry tokens in the path, add its log redaction
   ([§7](#7-log-redaction-for-other-apps)).
7. Run the leak test ([§6](#6-the-leak-test)).

**Recreate or reload?** Recreate (`app-compose edge up -d`) after a change to `edge.env`, to
`compose.yml` (`app-apply edge compose <file>` first) or to Caddy's image. Everything else, site
files, snippets, ranges and certificates, is a reload that `app-apply` does itself.

## 6. The leak test

Run it after any change to headers, logs or certificates, and before a new app goes live.

1. **Forged headers.** Start a throwaway container on `edge-jainav` that answers with the
   values of `X-Real-IP`, `X-Forwarded-For`, `CF-Connecting-IP`, `Sb-Forwarded-For`,
   `X-Forwarded-Host`, `True-Client-IP`, `X-Client-IP` and `Forwarded`. For the test only, add it
   to `UPSTREAMS` and install a `leaktest.{{DOMAIN}}` site file for it. Through Cloudflare:

   ```bash
   curl -s https://leaktest.{{DOMAIN}}/ \
     -H 'X-Forwarded-For: 203.0.113.9' -H 'True-Client-IP: 203.0.113.9' \
     -H 'CF-Connecting-IP: 203.0.113.9' -H 'X-Real-IP: 203.0.113.9' \
     -H 'X-Client-IP: 203.0.113.9' -H 'Forwarded: for=203.0.113.9'
   ```

   It passes when the four address headers each hold your real address, `X-Forwarded-Host`
   equals the host, and the other three headers are absent.

2. **The log line.** `journalctl CONTAINER_NAME=edge-caddy-1 -n 5 -o cat` for that request
   must show no visitor address, no request headers and no query string. For an app with a
   redaction file, request a path with a made-up token in it: the line must show the replacement,
   never the token.
3. **Straight to the origin.** From your machine, with the server's address:

   ```bash
   curl -4 -k --max-time 5 https://<server-ip>/    # must time out
   curl -6 -k --max-time 5 'https://[<server-ipv6>]/'   # must time out, from an IPv6-capable host
   ```

   Then add a temporary hPanel accept rule for your own address and run them again: they must
   still time out, because the host's `DOCKER-USER` rules are a layer of their own. Remove the
   rule afterwards.

4. **Origin pulls.** From the server, a TLS connection to its own 443 without a client
   certificate must fail in the handshake (after
   [§3](#3-certificates-and-authenticated-origin-pulls)):

   ```bash
   curl -sk --max-time 5 --resolve {{DOMAIN}}:443:127.0.0.1 https://{{DOMAIN}}/ ; echo "exit $?"   # must not be 0
   ```

5. Remove the test site, the container and the `UPSTREAMS` entry.

## 7. Log redaction for other apps

The public `log_fields` snippet already removes query strings and the token in Payload's
password-reset path. An app whose own paths carry a token adds one more line, in a file that
exists only on the server, so the repository never holds the app's URL patterns.

- The file is `/srv/edge/config/log-redact.d/<app>.caddy` (root, 0644, never in git). Each
  non-comment line has exactly one form:

  ```
  request>uri regexp <pattern> <replacement>
  ```

- `snippets.caddy` imports `log-redact.d/*.caddy` after its own `request>uri` line, so the
  public rule runs first. A directory with no files only gives a warning.
- Install one with:

  ```bash
  sudo app-apply edge redact <app> ~/incoming/<app>.caddy
  ```

  It refuses a line of any other form and an `<app>` with no conf. Then it validates the whole
  tree and reloads Caddy. `app-apply edge config` never deletes `log-redact.d`.

- The app's conf sets `LOG_REDACT=1`. hostwatch's daily run then alerts while the file is
  missing.
- Keep the file in the app's own repository as well. The edge has no settings archive: after a
  server loss the file is installed again
  ([backups.md](backups.md#disaster-recovery-on-a-new-server)).
- Test with a token path as in [§6](#6-the-leak-test) step 2.
