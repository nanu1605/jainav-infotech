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
     the zone's own CA, which Cloudflare presents
     ([§3](#3-certificates-and-authenticated-origin-pulls)).
- **Files on the server**, in `/srv/edge`:

  | Path                                 | What                                                                        |
  | ------------------------------------ | --------------------------------------------------------------------------- |
  | `compose.yml`                        | the edge project                                                            |
  | `edge.env` (0600)                    | every app's values the site files read, as `{$JAINAV_…}`                    |
  | `config/Caddyfile`, `snippets.caddy` | global options and the shared snippets (the admin's own)                    |
  | `config/cloudflare-ranges.caddy`     | the trusted proxies, written by `cf-ranges apply`                           |
  | `config/sites/<app>.caddy`           | each app's site file                                                        |
  | `config/log-redact.d/<app>.caddy`    | an app's log redaction, server only ([§7](#7-log-redaction-for-other-apps)) |
  | `certs/<app>/`                       | `origin.pem`, `origin-key.pem` (0600), `aop-ca.pem`, `aop-client.pem`       |

- Log lines hold the time, method, host, path, status, size and duration, Cloudflare's address,
  and the connection's TLS details. These include the zone's client certificate from
  authenticated origin pulls (`client_common_name`, and `client_serial` in decimal): Cloudflare's,
  the same on every line, kept so that a replaced certificate shows. They hold no visitor address,
  no headers and no query string.
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

Every one of them validates the whole tree. So on a new server `install.sh` puts the first
`Caddyfile` and `snippets.caddy` in place, `sudo cf-ranges apply` writes the ranges file before
any other `app-apply edge` command (the `Caddyfile` imports it), and then the admin installs
`edge.env` with `app-apply edge env` ([server.md §2](server.md#2-put-the-files-in-place)).

Caddy logs "Unnecessary header_up X-Forwarded-Host" each time it loads the config: in its own
journal (`journalctl CONTAINER_NAME=edge-caddy-1`), and in `journalctl -t app-apply` for every
validate. It is expected: `snippets.caddy` sets that header on purpose (its comment says why).

`edge.env` is read when the container is **created**, not on a reload. After
`app-apply edge env`, recreate Caddy between 01:00 and 07:00 IST: `sudo app-compose edge up -d`
([§5](#5-adding-an-app) step 7). Until then `app-apply` refuses site files and `edge cert`,
`config`, `ranges`, `redact` and `reload` with "recreate Caddy first"; `edge compose` and
`edge validate` still run. Every name in `edge.env` must start with the `ENV_PREFIX` of an app
that has a conf in `/etc/apps/` (`JAINAV_` for this site), and every value must be set.

## 3. Certificates and authenticated origin pulls

### Origin certificate for a zone

Each zone has one Cloudflare Origin CA certificate for the zone and `*.<zone>`, made from a CSR
generated on the server, so the private key never leaves it. Name the app and its zone once, at
the start of the session; the commands below read them:

```bash
app=jainav zone=jainavinfotech.in
```

These are Jainav's. Another app uses its own name and the `ZONE` of its conf in `/etc/apps/`.
Set them again in every new session, after a dropped connection too. Where an empty name wouldn't
stop a command by itself, the command reads `${app:?}` or `${zone:?}`: bash then refuses to run
it while the name is unset ("parameter null or not set").

1. On the server, in a directory only you can read. The subshell keeps the strict umask out of
   your session, and it sees the two names:

   ```bash
   (umask 077 && mkdir ~/csr && cd ~/csr && openssl req -new -newkey rsa:2048 -nodes \
     -keyout origin-key.pem -out origin.csr -subj "/CN=$zone" \
     -addext "subjectAltName=DNS:$zone,DNS:*.$zone") && cat ~/csr/origin.csr
   ```

   In double quotes the shell fills in `$zone` and leaves the `*` alone. If `mkdir` says that
   `~/csr` exists, an earlier try left it: `rmdir ~/csr` removes it only while it is empty. One
   with a key in it belongs to a CSR you made before: go on with that one from step 2
   (`cat ~/csr/origin.csr` prints it).

2. Cloudflare → the zone → SSL/TLS → Origin Server → Create Certificate → _Use my private key
   and CSR_. Never choose _Generate private key and CSR with Cloudflare_: that key would be made
   outside the server. Paste the whole CSR, from its `-----BEGIN CERTIFICATE REQUEST-----` line to
   its `-----END CERTIFICATE REQUEST-----` line: without the END line Cloudflare says
   "CSR parsed as empty". Hostnames `$zone` and `*.$zone`, 15 years. Copy the certificate with
   the copy button Cloudflare shows beside it. If someone else runs the zone at Cloudflare (another
   app's owner), they do this step: send them the CSR, which holds no secret, and they send the
   certificate back.
3. On the server, run `cat > ~/csr/origin.pem`, paste the certificate, press Enter, then Ctrl-D.
   `cat >` overwrites the file, so another try starts clean. Check it, and that it belongs to the
   key:

   ```bash
   openssl x509 -in ~/csr/origin.pem -noout -subject -enddate -ext subjectAltName; grep -c $'\r' ~/csr/origin.pem
   [ "$(openssl x509 -in ~/csr/origin.pem -noout -pubkey | sha256sum)" = "$(openssl pkey -in ~/csr/origin-key.pem -pubout | sha256sum)" ] && echo 'pair matches' || echo 'MISMATCH'
   ```

   Expect both hostnames, an end date about 15 years away, `0` and `pair matches`. This is the
   only early check that the two belong together: `app-apply` checks the files' text only, and
   Caddy loads the pair once a site uses it.

4. Install the pair (checked, then Caddy reloads). The key copy goes only if that worked. Every
   `tls_<app>` in `snippets.caddy` has `client_auth` on, so the zone's `aop-ca.pem`, the CA
   certificate of the next subsection, goes in with the pair as a fourth argument: Caddy reads it
   whenever it loads a site of the zone, and `app-apply` refuses the site file without it.
   Jainav's is in the password manager; another app's owner sends theirs. Put it in
   `~/incoming/aop-ca.pem` (with `scp`, or `cat > ~/incoming/aop-ca.pem`, paste, Enter, Ctrl-D),
   then:

   ```bash
   sudo app-apply edge cert "$app" ~/csr/origin.pem ~/csr/origin-key.pem ~/incoming/aop-ca.pem && shred -u ~/csr/origin-key.pem && rm -r ~/csr
   ```

   They land in `/srv/edge/certs/<app>/` (`origin.pem` and `aop-ca.pem` 0644, `origin-key.pem`
   0600). On a new server it says that Caddy isn't running yet, then prints
   "installed the <app> certificates in /srv/edge/certs/<app>/". If the command is interrupted
   (a closed session, Ctrl-C), run it again. Neither stops it halfway: before the swap nothing has
   changed, and once the swap has started `app-apply` finishes it, so the certificate and the key
   in place still match. The second run replaces both and reloads Caddy. Put the expiry on a
   calendar; hostwatch's daily run also warns before it. A later renewal of the pair alone may
   leave out the fourth argument: the installed `aop-ca.pem` stays. The client certificate goes
   beside it as step 4 of the next subsection shows.

### Authenticated origin pulls (a launch gate)

Cloudflare's shared client certificate proves only that a request came from Cloudflare's
network, which every Cloudflare customer shares. So each zone uses a client certificate from a
CA of its own: ours for Jainav's zone, the app owner's for another app's. **It must be on for the
site's zone, and tested, before the first production deploy, and on for every zone before the
first container of a second app runs on the server**
([launch.md](launch.md#gates-before-the-first-production-deploy)). It relies on Caddy 2.11.9 or
later, which treats conflicting `client_auth` policies as an error instead of dropping the
stricter one, so the edge never goes below that version.

For a zone we run, with `app` and `zone` set as above, on your machine too. Steps 1 to 3 change
nothing on the server, so they can run at any time; steps 4 to 6 reload Caddy, between 01:00 and
07:00 IST, in one session. Order matters: Cloudflare presents the certificate first, then Caddy
requires it. Cloudflare sends a client certificate only to an origin that asks for one, and until
step 6 Caddy doesn't ask, or asks without requiring it.

1. **The CA and the client certificate**, on your machine in Git Bash. The commands name
   `/usr/bin/openssl`, Git for Windows' MSYS build of OpenSSL 3: it takes `/CN=…` as written and
   writes the LF line endings `app-apply` needs. The `openssl` that Git Bash finds first is a
   native build, which turns `/CN=…` into a Windows path and writes CRLF. Elsewhere any
   OpenSSL 3 does. In a new folder that only you can read, as one paste:

   ```bash
   umask 077; mkdir ~/"${app:?}"-aop && cd ~/"$app"-aop &&
   /usr/bin/openssl req -x509 -newkey rsa:4096 -noenc -days 3650 -subj "/CN=${zone:?} origin pulls CA" -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' -addext 'keyUsage=critical,keyCertSign,cRLSign' -addext 'subjectKeyIdentifier=hash' -addext 'authorityKeyIdentifier=none' -keyout aop-ca-key.pem -out aop-ca.pem &&
   /usr/bin/openssl req -x509 -newkey rsa:2048 -noenc -days 730 -CA aop-ca.pem -CAkey aop-ca-key.pem -subj "/CN=${zone:?} origin pulls" -addext 'basicConstraints=critical,CA:FALSE' -addext 'keyUsage=critical,digitalSignature' -addext 'extendedKeyUsage=clientAuth' -addext 'authorityKeyIdentifier=keyid:always' -keyout aop-client-key.pem -out aop-client.pem
   ```

   They print dots and dashes while they work, never a key. The CA lasts ten years and the client
   certificate two ([decisions](../decisions.md)). If `mkdir` says the folder exists, nothing
   else ran: an earlier try left it (remove it, `cd ~ && rm -r ~/"$app"-aop`) or an earlier round
   (move it aside, `mv -T ~/"$app"-aop ~/"$app"-aop-old`). A command that fails can still leave a
   new key behind: remove the folder and start again. Check the result; nothing here prints a key:

   ```bash
   for f in aop-ca.pem aop-client.pem; do /usr/bin/openssl x509 -in "$f" -noout -subject -issuer -enddate -ext basicConstraints,keyUsage,extendedKeyUsage; done
   /usr/bin/openssl verify -CAfile aop-ca.pem -purpose sslclient aop-client.pem
   [ "$(/usr/bin/openssl x509 -in aop-client.pem -noout -pubkey | sha256sum)" = "$(/usr/bin/openssl pkey -in aop-client-key.pem -pubout | sha256sum)" ] && echo 'pair matches' || echo 'MISMATCH'
   grep -c $'\r' *.pem
   ```

   The CA names itself as subject and issuer, with `CA:TRUE, pathlen:0` and
   `Certificate Sign, CRL Sign`, and has no extended key usage. The client certificate names the
   CA as its issuer, with `CA:FALSE`, `Digital Signature` and `TLS Web Client Authentication`,
   and ends two years from now. Then come `aop-client.pem: OK`, `pair matches`, and `:0` for every
   file. The pair check needs its `-pubout`: without it `pkey` prints the key.

2. **The CA stays with you; Cloudflare gets the client pair.** `clip < <file>` copies a file
   without showing it. Copy a key only while Windows' _Clipboard history across your devices_
   (Settings → System → Clipboard) is off: it uploads what you copy.
   - The password manager gets one entry for the zone's origin pulls: the CA key, the CA
     certificate and the client certificate.
   - Cloudflare → the zone → SSL/TLS → Origin Server → Authenticated Origin Pulls. Global stays
     off, and the zone has no per-hostname certificate: one would replace the zone-level
     certificate for its hostname. Under _Zone-level_, _Upload certificate_: `aop-client.pem` in
     the certificate field, `aop-client-key.pem` in the private key field, _Continue_. The details
     show the CA as the issuer and the end date; _Done_. Wait until the certificate shows Active,
     then turn _Zone-level_ on. Never upload the CA: Cloudflare refuses it ("missing leaf
     certificate").
   - Check that the entry holds the whole CA key, from its `-----BEGIN PRIVATE KEY-----` line to
     its `-----END PRIVATE KEY-----` line. Then empty the clipboard (`clip < /dev/null`; with
     Windows' clipboard history on, clear that too: Win+V, _Clear all_) and delete both keys:
     `rm aop-ca-key.pem aop-client-key.pem`.
     Cloudflare keeps the client key, and nothing else needs it: a new client certificate comes
     from the CA. The folder keeps `aop-ca.pem` and `aop-client.pem`, which hold no secret.

3. **The files on the server.** From the folder on your machine,
   `scp aop-ca.pem aop-client.pem jainav:incoming/`, and from the repository root on an
   up-to-date `main`, `scp docker/edge/config/snippets.caddy jainav:incoming/`.

4. **The CA on the server**, a reload, though no site uses the CA yet. `app-apply edge cert`
   always takes the Origin CA pair too; name the installed one:

   ```bash
   sudo app-apply edge cert "$app" "/srv/edge/certs/$app/origin.pem" "/srv/edge/certs/$app/origin-key.pem" ~/incoming/aop-ca.pem
   sudo install -m 0644 -o root -g root ~/incoming/aop-client.pem "/srv/edge/certs/${app:?}/"
   ```

   If the first is interrupted, run it again: it replaces every file it names. The second stores
   the client certificate, never its key, so that hostwatch's daily check warns before it
   expires; the check reads `aop-ca.pem` too.

5. **See the certificate before Caddy requires it.** Keep the installed `snippets.caddy` for a
   way back, and make a copy of the repository's in which the zone's snippet asks for a client
   certificate without checking it (`mode request`). Each copy keeps the name `snippets.caddy`,
   in its own folder, because `app-apply edge config` installs a file under its own name:

   ```bash
   mkdir -p ~/incoming/before ~/incoming/request
   [ -s ~/incoming/before/snippets.caddy ] || sudo cat /srv/edge/config/snippets.caddy > ~/incoming/before/snippets.caddy
   awk -v b="(tls_${app:?}) {" '$0 == b {s = 1} s && sub(/mode require_and_verify/, "mode request") {s = 0} {print}' ~/incoming/snippets.caddy > ~/incoming/request/snippets.caddy
   diff ~/incoming/snippets.caddy ~/incoming/request/snippets.caddy
   sudo app-apply edge config ~/incoming/request/snippets.caddy && t=$(date '+%F %T')
   ```

   `diff` shows one changed line, `mode request` in `tls_<app>`. After the install, open a page of
   each live hostname of the zone through Cloudflare from your machine
   (`curl -s -o /dev/null -w '%{http_code}\n' "https://staging.$zone/"` answers `401`). Then read
   on the server, for each host, which certificate its requests came with since the install, and
   the serial of `aop-client.pem` in the log's decimal notation:

   ```bash
   journalctl CONTAINER_NAME=edge-caddy-1 --since "${t:?}" -o cat --no-pager | grep '"logger":"http.log.access' | sed -E 's/.*"host":"([^"]*)".*"client_common_name":"([^"]*)","client_serial":"([0-9]*)".*/\1: \2, \3/; t; s/.*"host":"([^"]*)".*/\1: no certificate/' | sort | uniq -c
   python3 -c 'import sys; print(int(sys.argv[1].split("=")[1], 16))' "$(openssl x509 -in ~/incoming/aop-client.pem -noout -serial)"
   ```

   Every host of the zone shows `<zone> origin pulls` with that serial; a host of another zone
   shows that zone's own certificate. A host of the zone with `no certificate`, another name or
   another serial means that Cloudflare doesn't present the new certificate on every connection
   yet. A request that was already under way at the install can still end as `no certificate`, so
   first look once more (`t=$(date '+%F %T')`, open the pages, run the two lines). If it stays,
   stop, check the certificate's status at Cloudflare, and look again later. Leave this copy in
   place meanwhile, overnight too: until step 6 it accepts any client, as before, and the
   repository's file goes in only at step 6.

6. **Require it.** Install the repository's file (a reload):

   ```bash
   sudo app-apply edge config ~/incoming/snippets.caddy
   ```

   Then, from your machine at once, each live hostname answers through Cloudflare as before. If
   one answers `525` or another `52x` instead, put the kept file back first:
   `sudo app-apply edge config ~/incoming/before/snippets.caddy`. Turning zone-level pulls off at
   Cloudflare is no way back while Caddy requires the certificate: Caddy would refuse every
   request. Undo in the reverse order: Caddy first, then Cloudflare. Caddy logs a refused client
   only at debug level; to see why, switch its log to debug until the next reload:

   ```bash
   sudo docker exec edge-caddy-1 wget -qO- --header 'Content-Type: application/json' --post-data '"DEBUG"' http://127.0.0.1:2019/config/logging/logs/default/level
   ```

   The journal then shows `http: TLS handshake error … tls: client didn't provide a certificate`
   (Cloudflare sent none) or `… signed by unknown authority` (another CA's certificate).
   `sudo app-apply edge reload` sets the level back.

7. **Test.** The origin test of [§6](#6-the-leak-test), step 4: from the server, every host of the
   zone refuses a client without the certificate. On the zone's first round, the rest of §6 too.
   Check that `ssh jainav` and the R2 custom domains (`cdn.`, `downloads.`) still work: origin
   pulls only affect proxied hostnames that Caddy serves. Then remove the copies:
   `rm -r ~/incoming/before ~/incoming/request ~/incoming/aop-ca.pem ~/incoming/aop-client.pem`.

**Another app's zone.** Its owner does steps 1 and 2 on their own machine and at Cloudflare: the
app's own CA and client certificate, the upload of the client pair, and zone-level origin pulls
switched on. They send the admin only `aop-ca.pem` and `aop-client.pem`: no private key changes
hands. Its `tls_<app>` comes with `client_auth` on, so `aop-ca.pem` goes in with the app's first
certificate (step 4 of the subsection above), before the app's site file
([§5](#5-adding-an-app)): Caddy reads it once a site imports the snippet, so `app-apply` refuses
the site file without it. `aop-client.pem` is stored as in step 4, steps 5 and 6 don't apply,
step 7 follows the site file, and the owner checks their own hostnames that Caddy doesn't serve.

**A new client certificate**, before the old one ends: hostwatch warns 60 days ahead, and
Cloudflare can mail too (Notifications, the expiration alert for zone-level authenticated origin
pulls certificates). In the zone's folder, put the CA key back from the password manager
(`umask 077; cat > aop-ca-key.pem`, paste, Enter, Ctrl-D), make the client certificate with the
last command of step 1 (it replaces `aop-client.pem`), run the checks, and do step 2 for it:
upload, Active (Cloudflare presents the newest), then delete the old one at Cloudflare and both
keys here. If the dashboard has no delete for it, Cloudflare's docs give the API,
`DELETE /zones/<zone id>/origin_tls_client_auth/<certificate id>` with a token that has SSL and
Certificates Write; until then the old one does no harm. The server keeps its CA, and only
`aop-client.pem` changes: `scp aop-client.pem jainav:incoming/`, step 4's second line, then
`rm ~/incoming/aop-client.pem`. The serial in the log changes with it.

**A new CA**, when it nears its end or a key may have leaked: Caddy checks no revocation, so a new
CA is the only way to shut out a leaked client key. Move the old folder aside
(`mv -T ~/"$app"-aop ~/"$app"-aop-old`, which refuses while an older `-old` folder is still
there) and do step 1 again. The server trusts both CAs first: from the new folder,
`cat aop-ca.pem ../"$app"-aop-old/aop-ca.pem > aop-ca-both.pem`,
`scp aop-ca-both.pem jainav:incoming/aop-ca.pem` and `scp aop-client.pem jainav:incoming/`, then
step 4's first line. Then step 2 for the new pair, its serial in the log (step 5's two lines, with
`t=$(date '+%F %T')` set on the server once the certificate shows Active), the old client
certificate deleted at Cloudflare as above, and last the new CA alone: step 3's first `scp` and
step 4. Then remove the copies: `rm ~/incoming/aop-ca.pem ~/incoming/aop-client.pem` on the
server, and `rm -r ../"$app"-aop-old aop-ca-both.pem` here. For another app's zone its owner does
the Cloudflare part and sends the new files.

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

An app joins the edge in this order. Set `app` and `zone` for it first, and again in every new
session, as in [§3](#3-certificates-and-authenticated-origin-pulls): the commands below read them.

1. **The conf.** The admin writes `/etc/apps/<app>.conf` (root, 0644) from the values the app's
   maintainers send; `docker/host/apps/app.conf.example` documents every setting. The ones
   that matter here: `ZONE` (its domain), `UPSTREAMS` (the container names and ports Caddy may
   proxy to), `ENV_PREFIX` (`<APP>_`, for example `MENUMESH_`), `EDGE_NETWORKS` and
   `LOG_REDACT`. Every later step needs it: `app-apply` refuses an app without a conf, and
   `edge.env` takes only names that start with the `ENV_PREFIX` of a configured app. Written as
   `~/incoming/<app>.conf`, it goes in with:

   ```bash
   sudo install -m 0644 -o root -g root ~/incoming/"$app".conf /etc/apps/
   ```

   From then on hostwatch watches the app too. Until its own stack is in (step 8), the daily run
   warns that it can't list the images of the app's compose file and, when the conf sets
   `CONFIG_ARCHIVE_FILES`, that `app-config-archive@<app>.timer` is off.

2. **The networks.** Caddy and the app meet on two internal networks, `edge-<app>` and
   `edge-<app>-staging`. MenuMesh's are in place already: listed in `EDGE_NETWORKS` in
   `/etc/apps/edge.conf` and in `docker/edge/compose.yml`, created by `app-apply edge compose`
   ([server.md §2](server.md#2-put-the-files-in-place)), and joined by Caddy. Check them:

   ```bash
   sudo docker network inspect -f '{{.Name}} internal={{.Internal}}:{{range .Containers}} {{.Name}}{{end}}' \
     "edge-$app" "edge-$app-staging"
   ```

   Each line shows `internal=true` and `edge-caddy-1`. A later app's two networks come by a pull
   request that adds them to `EDGE_NETWORKS` in `docker/host/apps/edge.conf` and to
   `docker/edge/compose.yml` (the service's `networks` and the top-level ones, `external: true`).
   After the merge, add them to `EDGE_NETWORKS` in `/etc/apps/edge.conf` too (`sudoedit`):
   `install.sh` never overwrites a conf, and `app-apply edge compose` refuses an external network
   that isn't listed there. Then copy the new `compose.yml` to `~/incoming/` and install it. It
   creates the missing networks as internal ones, and Caddy joins them at the recreate (step 7):

   ```bash
   sudo app-apply edge compose ~/incoming/compose.yml
   ```

   For a later app, do this step before step 1: it doesn't need the app's conf, and hostwatch
   reports an edge network that a conf names as missing until the network exists. The app's own
   compose file attaches only its web-facing services to the two networks.

3. **The log-redaction file**, when the conf sets `LOG_REDACT=1`. It goes in right after the
   conf: hostwatch's daily run raises a critical alert while it is missing
   ([§7](#7-log-redaction-for-other-apps)):

   ```bash
   sudo app-apply edge redact "$app" ~/incoming/"$app"-log-redact.caddy
   ```

4. **The certificate** for the app's zone, made and installed as in
   [§3](#3-certificates-and-authenticated-origin-pulls), with the app's `aop-ca.pem` as the
   fourth argument of the install. Its owner has turned zone-level origin pulls on and sent
   `aop-ca.pem` and `aop-client.pem` first. The client certificate is stored as §3 says:

   ```bash
   sudo install -m 0644 -o root -g root ~/incoming/aop-client.pem "/srv/edge/certs/${app:?}/"
   ```

5. **The snippet.** The app's `tls_<app>` comes into this repository's `snippets.caddy` by a pull
   request, with `client_auth` on (MenuMesh's `tls_menumesh` is there already). The file holds
   `tls_jainav` with `client_auth` on too, so it goes in only once Jainav's origin pulls are on
   ([§3](#3-certificates-and-authenticated-origin-pulls), steps 1 to 6): before that round's step 4
   `app-apply` refuses it (there is no `/certs/jainav/aop-ca.pem`). After the merge,
   copy the file from the repository root on your machine, as
   [server.md §2](server.md#2-put-the-files-in-place) copies the other edge files:

   ```bash
   scp docker/edge/config/snippets.caddy jainav:incoming/
   ```

   Then, on the server (it checks every installed site again):

   ```bash
   sudo app-apply edge config ~/incoming/snippets.caddy
   ```

   An app's own kit never adds its snippet to the server's file: that file stays the same as this
   repository's, and Caddy refuses a snippet declared twice.

6. **The `edge.env` names**, merged into the one file every app shares. Start from a copy of the
   installed file that only you can read:

   ```bash
   (umask 077; sudo cat /srv/edge/edge.env > ~/incoming/edge.env)
   [ -z "$(tail -c1 ~/incoming/edge.env)" ] || echo >> ~/incoming/edge.env
   ```

   The second line ends the copy's last line with a newline if it has none, so the first line you
   add can't join the last value. Then run `cat >> ~/incoming/edge.env`, paste the app's lines,
   press Enter, then Ctrl-D. `cat` expands nothing, which matters for a hash full of `$`. The
   app's maintainers send the lines: every name starts with the app's `ENV_PREFIX`, and a hash
   stays between single quotes, as in `edge.env.example`. The app's owner makes that hash off the
   server with the pinned image and `caddy hash-password --algorithm bcrypt` (the edge's step 3 in
   [server.md §2](server.md#2-put-the-files-in-place) has the form): only the hash is sent, never
   the password. Check the names and lengths without printing a value:

   ```bash
   awk '/^[A-Za-z_][A-Za-z0-9_]*=/ {i = index($0, "="); k = substr($0, 1, i - 1); n[k]++; printf "%s(%d) ", k, length($0) - i} END {for (k in n) if (n[k] > 1) printf "TWICE:%s ", k; print ""}' ~/incoming/edge.env
   ```

   Every app's names show, none with `(0)`, no `TWICE:`, and each `_AUTH_HASH` with `(62)`: a
   60-character bcrypt hash and its two quotes. Then install it; the copy goes only if that
   worked:

   ```bash
   sudo app-apply edge env ~/incoming/edge.env && shred -u ~/incoming/edge.env
   ```

   If it refuses, fix the copy and run it again. When you stop, either way, remove the copy with
   `shred -u ~/incoming/edge.env`. Keep the app's lines in the password manager with the rest of
   `edge.env`: the edge has no settings archive
   ([backups.md](backups.md#disaster-recovery-on-a-new-server)).

7. **The recreate**, between 01:00 and 07:00 IST: Caddy reads `edge.env` only when it is created
   (a few seconds of downtime for every site). Then check Caddy and validate the live tree:

   ```bash
   sudo app-compose edge up -d
   sudo app-compose edge ps
   sudo app-apply edge validate
   ```

   `edge-caddy-1` is Up and turns (healthy) within about a minute, and `validate` prints "the live
   edge tree is valid". If `up -d` fails or Caddy doesn't turn healthy, its output and Caddy's
   journal (`journalctl CONTAINER_NAME=edge-caddy-1 -n 20 -o cat --no-pager`) say why; no site
   answers while Caddy is down. To undo step 6, put back the `edge.env` it replaced and recreate
   again. `app-apply` keeps the last five it replaced as `edge.env.<time>`, the time in UTC, in
   `/var/lib/app-apply/srv/edge/` (`sudo ls` lists them):

   ```bash
   sudo app-apply edge env /var/lib/app-apply/srv/edge/edge.env.<time>
   sudo app-compose edge up -d
   ```

   From step 6 until this recreate, `app-apply edge cert`, `config`, `ranges`, `redact` and
   `reload`, and every site file, are refused with "recreate Caddy first". That is why steps 3 to
   5 come first, step 6 right before this one, and the site file after it. One recreate can carry
   other changes that need one: a new Caddy image (**A new Caddy image** below), whose
   `app-apply edge compose` also goes before step 6, or a later app's networks (step 2).

8. **The app's own stack**, from its maintainers' runbook (`sudo app-apply <app> compose …` and
   the rest). Its first container runs only once origin pulls are on for every zone, Jainav's
   included ([§3](#3-certificates-and-authenticated-origin-pulls)). Every later app's snippet comes
   with `client_auth` on, so check that Jainav's zone still has them, as in [§6](#6-the-leak-test)
   step 4:

   ```bash
   for h in jainavinfotech.in www.jainavinfotech.in staging.jainavinfotech.in analytics.jainavinfotech.in; do
     e=$(curl -sSk -o /dev/null --max-time 5 --resolve "$h:443:127.0.0.1" "https://$h/" 2>&1); echo "$h exit $? ${e##*::}"
   done
   ```

   Every line must end as §6 step 4 says. If one ends in `exit 0`, stop here: that host takes
   clients without the certificate, and Jainav's origin pulls
   ([§3](#3-certificates-and-authenticated-origin-pulls)) come first.

9. **The site file**, after the recreate: its `{$NAME}` placeholders must name values in the
   installed `edge.env` ([§2](#2-site-files-and-their-checks)), and Caddy has those values only
   since it was recreated. It is a reload, no recreate:

   ```bash
   sudo app-apply "$app" site ~/incoming/"$app".caddy
   ```

10. **The leak test:** first the origin-pulls check for every host of the zone
    ([§6](#6-the-leak-test) step 4), then the rest of §6.

**Recreate or reload?** Recreate (`app-compose edge up -d`) after a change to `edge.env`, to
`compose.yml` (`app-apply edge compose <file>` first) or to Caddy's image. Everything else, site
files, snippets, ranges and certificates, is a reload that `app-apply` does itself.

**A new Caddy image.** The image is pinned by tag and digest (`caddy:<tag>@sha256:<digest>`), and
`CADDY_IMAGE` carries both. Dependabot's pull request changes them in `docker/edge/compose.yml`,
also when only the digest is new (the same tag, rebuilt). Copy the whole reference into
`CADDY_IMAGE` in `docker/host/apps/edge.conf` in the same pull request; CI fails while the two
differ. On the server:

1. Set the same `CADDY_IMAGE`, tag and digest, in `/etc/apps/edge.conf` (`sudoedit`).
   `install.sh` never overwrites a conf, so a new kit leaves the server's copy as it was, and
   `app-apply` reads `CADDY_IMAGE` from it for every check.
2. Pull the image: `sudo docker pull "$(sed -n 's/^CADDY_IMAGE=//p' /etc/apps/edge.conf)"`.
   Without it the next step pulls it, and a failed pull shows up as "caddy validate failed".
3. `sudo app-apply edge compose ~/incoming/compose.yml`. It refuses a file whose image differs from
   `CADDY_IMAGE`, and validates the live config with the new image.
4. Between 01:00 and 07:00 IST, `sudo app-compose edge up -d` to recreate Caddy (a few seconds of
   downtime), then run the leak test ([§6](#6-the-leak-test)).

## 6. The leak test

Run it after any change to headers, logs or certificates, and before a new app goes live.

**First, on the server.** Set `app` and `zone` as in
[§3](#3-certificates-and-authenticated-origin-pulls), again in every new session, and set `zone`
on your machine too, for step 1. Tell the app's maintainers before you start: hostwatch alerts
while the test container runs (below).

- Add `<app>-leaktest:80` to `UPSTREAMS` in the app's conf: `sudoedit "/etc/apps/${app:?}.conf"`.
- Pull the pinned echo server, then start it on the app's edge network. It answers every request
  with the request's headers:

  ```bash
  img=traefik/whoami:v1.12.0@sha256:c4717a8d1f0134a7444e24f881160e033991f23027c6c5a9a3f8fd22e70d1d44
  sudo docker pull "$img"
  sudo docker run -d --rm --name "$app-leaktest" --network "edge-$app" --network-alias "$app-leaktest" \
    --memory 64m --cpus 0.25 --cap-drop ALL --security-opt no-new-privileges --read-only "$img"
  ```

- Copy the app's installed site file (with `sudo`: `/srv/edge` is root's alone), add one block
  for `leaktest.<zone>` to the copy, and install that:

  ```bash
  sudo cat "/srv/edge/config/sites/$app.caddy" > ~/incoming/"$app"-live.caddy
  cp ~/incoming/"$app"-live.caddy ~/incoming/"$app"-leaktest.caddy
  cat >> ~/incoming/"$app"-leaktest.caddy <<EOF

  https://leaktest.$zone {
      import site_common
      import tls_$app
      reverse_proxy $app-leaktest:80 {
          import upstream
      }
  }
  EOF
  sudo app-apply "$app" site ~/incoming/"$app"-leaktest.caddy
  ```

- The zone's owner adds a proxied `leaktest` A record for the server, like the zone's others.

While the container runs, hostwatch's 5-minute check reports
`networks: edge network rules broken: <app>-leaktest@edge-<app>:wrong-project` on every run, as
critical: a container started with `docker run` belongs to no Compose project. Telegram gets it
once, then again every 6 hours while it lasts ([monitoring.md](monitoring.md#hostwatch)). Nothing
else should show: the alias, listed in `UPSTREAMS`, keeps `not-an-upstream` away, and the memory
and CPU limits keep the container out of the `limits` alert. Don't add the `kit.throwaway` label:
it marks `app-apply`'s own validation containers, which the limits check skips.

1. **Forged headers.** From your machine, through Cloudflare:

   ```bash
   curl -s "https://leaktest.$zone/" \
     -H 'X-Forwarded-For: 203.0.113.9' -H 'True-Client-IP: 203.0.113.9' \
     -H 'CF-Connecting-IP: 203.0.113.9' -H 'X-Real-IP: 203.0.113.9' \
     -H 'X-Client-IP: 203.0.113.9' -H 'Forwarded: for=203.0.113.9'
   ```

   The echo server prints the headers it got, with their names as Go writes them (`X-Real-Ip`,
   `Cf-Connecting-Ip`). It passes when the four address headers (`X-Real-IP`, `X-Forwarded-For`,
   `CF-Connecting-IP`, `Sb-Forwarded-For`) each hold your real address, `X-Forwarded-Host` equals
   the host, and the other three headers (`True-Client-IP`, `X-Client-IP`, `Forwarded`) are
   absent.

2. **The log line.** `journalctl CONTAINER_NAME=edge-caddy-1 -n 5 -o cat` for that request
   must show no visitor address, no request headers and no query string. Its TLS details name the
   zone's client certificate (`client_common_name`, `client_serial`): that is Cloudflare's, the
   same on every line. For an app with a redaction file, request a path with a made-up token in
   it: the line must show the replacement, never the token.
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
   [§3](#3-certificates-and-authenticated-origin-pulls)), for every host the app's site file
   serves. These are Jainav's; for another app, list the hosts of its site file:

   ```bash
   for h in "${zone:?}" "www.$zone" "staging.$zone" "analytics.$zone"; do
     e=$(curl -sSk -o /dev/null --max-time 5 --resolve "$h:443:127.0.0.1" "https://$h/" 2>&1); echo "$h exit $? ${e##*::}"
   done
   ```

   Every line must show an exit status other than 0 and `alert certificate required` (with
   Ubuntu 24.04's curl, `exit 56 tlsv13 alert certificate required, errno 0`): Caddy answered and
   asked for the client certificate, which only Cloudflare holds. A line with `exit 55` and
   `Connection reset by peer` is the same refusal, met while curl was still sending: run the loop
   again. `exit 0` means the host takes clients without it. `exit 7` (refused) or `exit 28` (no
   answer) means Caddy isn't answering at all, which proves nothing. With `zone` unset the loop
   refuses to run. A page opened through Cloudflare from your machine still answers as before
   (`staging.` `401`).

5. **Clean up**, in this order. First the app's own site file goes back: the test block needs
   its entry in `UPSTREAMS`, and without it `app-apply edge validate`, which hostwatch runs
   daily, refuses the installed site. Then the container stops (`--rm` removes it), so hostwatch
   never sees it outside `UPSTREAMS`. Then remove `<app>-leaktest:80` from `UPSTREAMS` again. In
   a new session, set `app` again first:

   ```bash
   sudo app-apply "$app" site ~/incoming/"$app"-live.caddy
   sudo docker stop "$app-leaktest"
   sudoedit "/etc/apps/${app:?}.conf"
   ```

   The zone's owner deletes the `leaktest` record. Then remove the copies and the image:

   ```bash
   rm ~/incoming/"$app"-live.caddy ~/incoming/"$app"-leaktest.caddy
   sudo docker image rm traefik/whoami@sha256:c4717a8d1f0134a7444e24f881160e033991f23027c6c5a9a3f8fd22e70d1d44
   ```

   hostwatch's next run is clean, and the one after it sends "resolved".

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
- Install one right after the app's conf ([§5](#5-adding-an-app) step 3). It goes in as
  `log-redact.d/<app>.caddy` whatever its name in `~/incoming/`, so give it a name there that
  can't be taken for the app's site file:

  ```bash
  sudo app-apply edge redact <app> ~/incoming/<app>-log-redact.caddy
  ```

  It refuses a line of any other form and an `<app>` with no conf. Then it validates the whole
  tree and reloads Caddy. `app-apply edge config` never deletes `log-redact.d`.

- The app's conf sets `LOG_REDACT=1`. hostwatch's daily run then alerts while the file is
  missing.
- Keep the file in the app's own repository as well. The edge has no settings archive: after a
  server loss the file is installed again
  ([backups.md](backups.md#disaster-recovery-on-a-new-server)).
- Test with a token path as in [§6](#6-the-leak-test) step 2.
