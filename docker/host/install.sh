#!/bin/bash
# Installs this kit's host settings on an Ubuntu 24.04 server, as root (docs/runbooks/server.md §2):
#   bash /root/kit/host/install.sh --admin-key-fpr SHA256:... --bootstrap-ssh-from <your IPv4>
#   bash /root/kit/host/install.sh --harden        the last step, once the tunnel works
# The kit is /root/kit/host (this directory), /root/kit/edge and /root/kit/keys (gha-<app>-<env>.pub).
# Safe to run again: a file is rewritten only when it differs, and nothing the admin filled in
# (/etc/apps/*.conf, edge.env, hostwatch.env) is ever overwritten. Hardening runs only on request,
# last, and refuses unless ops has a key and a password and cloudflared holds a tunnel connection.
set -euo pipefail
shopt -s inherit_errexit nullglob
umask 022
PATH=/usr/sbin:/usr/bin:/sbin:/bin; export PATH

HOST_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
EDGE_DIR=$HOST_DIR/../edge
KEYS_DIR=$HOST_DIR/../keys
SBIN=/usr/local/sbin
SCRIPTS=(app-deploy app-compose app-apply app-config-archive cf-ranges hostwatch)
CF_DIR=/etc/cf-ranges
SSHD_D=/etc/ssh/sshd_config.d

ADMIN_FPRS=()
BOOTSTRAP_IP=
HARDEN=0
TUNNEL_OPTIONAL=0   # --harden-without-tunnel: a rehearsal VM has no tunnel
WARNINGS=0
CHANGED=0           # set by put: did it write?
DOCKER_DIRTY=0      # Docker's settings or drop-ins changed: it needs a restart
CLOUDFLARED_DIRTY=0 # its drop-in changed: it needs a restart (not done here)
SSH_CHANGED=0
FW_RELOAD=0
LISTS_CHANGED=0
OPS_KEYS=()         # "type key comment" lines of the admin keys that match --admin-key-fpr
declare -A DEPLOY_KEYS   # user -> authorized_keys content

say() { printf '%s\n' "$*"; }
log() { logger -t install.sh -- "$*" || true; }
warn() { printf 'install.sh: warning: %s\n' "$*" >&2; WARNINGS=$((WARNINGS + 1)); }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }
usage() {
  cat >&2 <<'EOF'
usage: install.sh [--admin-key-fpr SHA256:...]... [--bootstrap-ssh-from <ipv4>] [--harden]
                  [--harden-without-tunnel]
  --admin-key-fpr      fingerprint of an admin key found in /root/.ssh/authorized_keys or
                        /root/kit/keys/ops-*.pub; only a matching key is given to ops
  --bootstrap-ssh-from  your IPv4: SSH to the public address is allowed from it until --harden
  --harden              install 00-hardening.conf, switch ssh.socket to ssh.service and remove the
                        bootstrap allowance; refuses unless ops has a key and a password and
                        cloudflared holds a tunnel connection
  --harden-without-tunnel  --harden without the tunnel check: for a rehearsal VM only
EOF
  exit 2
}

badarg() { printf 'install.sh: %s\n' "$*" >&2; usage; }

oct='(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])'
ipv4_re="^($oct\\.){3}$oct\$"
fpr_re='^SHA256:[A-Za-z0-9+/]{43}$'

while [ $# -gt 0 ]; do
  case $1 in
    --admin-key-fpr) [ $# -ge 2 ] || usage; ADMIN_FPRS+=("$2"); shift 2 ;;
    --bootstrap-ssh-from) [ $# -ge 2 ] || usage; BOOTSTRAP_IP=$2; shift 2 ;;
    --harden) HARDEN=1; shift ;;
    --harden-without-tunnel) HARDEN=1; TUNNEL_OPTIONAL=1; shift ;;
    *) usage ;;
  esac
done
for f in "${ADMIN_FPRS[@]}"; do
  [[ $f =~ $fpr_re ]] || badarg "not a SHA256 fingerprint: $f"
done
[ -z "$BOOTSTRAP_IP" ] || [[ $BOOTSTRAP_IP =~ $ipv4_re ]] || badarg "not an IPv4 address: $BOOTSTRAP_IP"

[ "$(id -u)" = 0 ] || die "run as root"
WORK=$(mktemp -d /run/install-host.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

# The interface of the default route: the one the filters name.
default_iface() {
  ip -o -4 route show default |
    awk '{ for (i = 1; i < NF; i++) if ($i == "dev" && !seen) { print $(i + 1); seen = 1 } }'
}

# "type key comment" of an authorized_keys or .pub line, options dropped; nothing for other lines.
key_fields() {
  local -a f
  local i
  read -ra f <<<"$1"
  for ((i = 0; i + 1 < ${#f[@]}; i++)); do
    if [[ ${f[i]} =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)$ ]]; then
      printf '%s %s %s\n' "${f[i]}" "${f[i + 1]}" "${f[*]:i+2}"
      return 0
    fi
  done
}

# SHA256:... of a key, or a failure if ssh-keygen doesn't accept it.
fingerprint() { # <type> <key>
  local out
  printf '%s %s\n' "$1" "$2" >"$WORK/key.pub"
  out=$(ssh-keygen -lf "$WORK/key.pub") || return 1
  read -r _ out _ <<<"$out"
  printf '%s\n' "$out"
}

# The app confs: the installed /etc/apps/<app>.conf, or else the kit's copy (installed once later).
# Edge is the proxy, not an app. A conf holds settings only; it is read in a subshell.
conf_path() { # <app> -> the conf's path, or a failure
  local p
  for p in "/etc/apps/$1.conf" "$HOST_DIR/apps/$1.conf"; do
    if [ -f "$p" ]; then printf '%s' "$p"; return 0; fi
  done
  return 1
}
conf_apps() {
  local f n
  for f in /etc/apps/*.conf "$HOST_DIR"/apps/*.conf; do
    n=${f##*/}
    n=${n%.conf}
    case $n in edge | '' | *[!a-z0-9]*) continue ;; esac
    printf '%s\n' "$n"
  done | sort -u
}
conf_val() { # <app> <VARIABLE> -> its value, or nothing
  local p
  p=$(conf_path "$1") || return 0
  (
    set +u
    # shellcheck source=/dev/null
    . "$p" >/dev/null 2>&1
    printf '%s' "${!2-}"
  )
}

# Is sshd listening on a non-loopback address?
public_ssh_listener() {
  local addr
  while read -r addr; do
    case $addr in
      '' | 127.* | '[::1]'*) ;;
      *) return 0 ;;
    esac
  done < <(ss -H -tln 'sport = :22' | awk '{ print $4 }')
  return 1
}

collect_admin_keys() {
  local fpr src line t k c fp found
  for fpr in "${ADMIN_FPRS[@]}"; do
    found=0
    for src in /root/.ssh/authorized_keys "$KEYS_DIR"/ops-*.pub; do
      [ -f "$src" ] || continue
      while IFS= read -r line || [ -n "$line" ]; do
        read -r t k c <<<"$(key_fields "$line")"
        [ -n "$k" ] || continue
        fp=$(fingerprint "$t" "$k") || continue
        [ "$fp" = "$fpr" ] || continue
        OPS_KEYS+=("$t $k $c")
        found=1
      done <"$src"
    done
    [ "$found" = 1 ] || die "no key with fingerprint $fpr in /root/.ssh/authorized_keys or $KEYS_DIR/ops-*.pub"
  done
}

collect_deploy_keys() {
  local f base app env user line t k fp n
  for f in "$KEYS_DIR"/gha-*.pub; do
    base=${f##*/}
    base=${base%.pub}
    [[ $base =~ ^gha-([a-z0-9]+)-([a-z0-9]+)$ ]] || die "key file name must be gha-<app>-<env>.pub: $f"
    app=${BASH_REMATCH[1]}
    env=${BASH_REMATCH[2]}
    user=deploy-$app
    conf_path "$app" >/dev/null || die "$f: there is no /etc/apps/$app.conf for $app"
    [ "$(conf_val "$app" CI_USER)" = "$user" ] || die "$f: CI_USER in $app.conf is not $user"
    case " $(conf_val "$app" CI_ENVS) " in
      *" $env "*) ;;
      *) die "$f: $app.conf lets CI deploy only: $(conf_val "$app" CI_ENVS)" ;;
    esac
    n=$(grep -c -v -e '^[[:space:]]*$' -e '^[[:space:]]*#' "$f" || true)
    [ "$n" = 1 ] || die "$f must hold exactly one public key"
    line=$(grep -v -e '^[[:space:]]*$' -e '^[[:space:]]*#' "$f")
    read -r t k _ <<<"$(key_fields "$line")"
    [ "$t" = ssh-ed25519 ] || die "$f is not an ssh-ed25519 public key"
    [[ $k =~ ^[A-Za-z0-9+/]+=*$ ]] || die "$f: the key is not base64"
    fp=$(fingerprint "$t" "$k") || die "$f: ssh-keygen does not accept this key"
    DEPLOY_KEYS[$user]+="restrict,command=\"/usr/bin/sudo -n $SBIN/app-deploy $env\" $t $k gha-$app-$env"$'\n'
    say "deploy key $base: $fp"
  done
}

preflight() {
  local c f app u
  # jq and age: hostwatch, app-apply, app-compose and app-config-archive can't run without them.
  for c in ip ss sshd ssh-keygen visudo systemctl journalctl iptables ip6tables iptables-restore \
    ip6tables-restore flock logger adduser usermod groupadd getent cmp diff install stat mktemp awk \
    jq age; do
    command -v "$c" >/dev/null 2>&1 || die "missing command: $c (docs/runbooks/server.md §1)"
  done
  for c in curl openssl; do
    command -v "$c" >/dev/null 2>&1 || warn "missing command: $c (hostwatch and the certificate checks need it)"
  done
  if ! grep -q '^ID=ubuntu' /etc/os-release 2>/dev/null; then warn "this is not Ubuntu: the kit is written for 24.04"; fi
  [ -f "$HOST_DIR/cf-ranges" ] || die "cf-ranges is not in the kit ($HOST_DIR)"
  for f in daemon.json journald/zz-retention.conf sysctl/90-server.conf ssh/10-users.conf ssh/00-hardening.conf; do
    [ -f "$HOST_DIR/$f" ] || die "missing in the kit: $f"
  done
  for f in "$EDGE_DIR/cloudflare-ips-v4.txt" "$EDGE_DIR/cloudflare-ips-v6.txt"; do
    [ -s "$f" ] || die "missing in the kit: $f"
  done
  for f in "${SCRIPTS[@]}"; do
    if [ ! -f "$HOST_DIR/$f" ]; then warn "$f is not in the kit: not installed"; continue; fi
    bash -n "$HOST_DIR/$f" || die "$f has a syntax error"
  done
  # Without this line the drop-ins (the users' Match blocks, the hardening) would do nothing.
  grep -Eq '^[[:space:]]*Include[[:space:]]+/etc/ssh/sshd_config\.d/\*\.conf' /etc/ssh/sshd_config ||
    die "/etc/ssh/sshd_config does not include sshd_config.d/*.conf"
  [ -n "$(default_iface)" ] || die "no default route: the filters can't name the public interface"
  for app in $(conf_apps); do
    u=$(conf_val "$app" CI_USER)
    [ -z "$u" ] || [[ $u =~ ^deploy-[a-z0-9]+$ ]] || die "$app.conf: CI_USER must look like deploy-<app>"
  done
  # A wrong address here closes port 22 to the session in use once its connection is gone.
  if [ -n "$BOOTSTRAP_IP" ] && [ -n "${SSH_CONNECTION-}" ] && [ "${SSH_CONNECTION%% *}" != "$BOOTSTRAP_IP" ]; then
    warn "this session comes from ${SSH_CONNECTION%% *}, not from --bootstrap-ssh-from $BOOTSTRAP_IP"
  fi
  collect_admin_keys
  collect_deploy_keys
  # Loading the filters closes port 22 to everyone but the bootstrap address. Don't do that to an
  # admin who is on the public address with no way back but the console.
  if [ -z "$BOOTSTRAP_IP" ] && [ ! -f "$CF_DIR/bootstrap-ssh" ] && public_ssh_listener &&
    ! { systemctl is-active --quiet cf-ranges-firewall.service && "$SBIN/cf-ranges" verify >/dev/null 2>&1; }; then
    die "sshd listens on the public address and nothing would admit you once the filters load: pass --bootstrap-ssh-from <your IPv4>"
  fi
  if [ "$HARDEN" = 1 ] && [ "${#ADMIN_FPRS[@]}" = 0 ] && [ ! -s /home/ops/.ssh/authorized_keys ]; then
    die "--harden needs an admin key for ops: pass --admin-key-fpr"
  fi
  if [ "$HARDEN" = 1 ] && [ "$TUNNEL_OPTIONAL" = 0 ]; then
    command -v curl >/dev/null 2>&1 || die "--harden reads the tunnel's metrics with curl, which is missing"
  fi
}

# put <mode> <source> <dest>: root-owned, written only if the content, mode or owner differ.
# The temporary name has a dot, so sudo's includedir and sshd's Include globs ignore it.
put() {
  local mode=$1 src=$2 dst=$3
  CHANGED=0
  [ -f "$src" ] || die "missing in the kit: $src"
  mkdir -p "$(dirname "$dst")"
  if [ -f "$dst" ] && cmp -s "$src" "$dst" && [ "$(stat -c '%a %U:%G' "$dst")" = "${mode#0} root:root" ]; then
    return 0
  fi
  install -m "$mode" -o root -g root "$src" "$dst.new"
  mv -f "$dst.new" "$dst"
  CHANGED=1
  say "installed $dst"
}

# Never overwrites. A conf differing from the kit's is shown, not replaced (an env file might hold
# secrets, so those are never shown).
put_once() { # <mode> <source> <dest> [show]
  CHANGED=0
  if [ ! -e "$3" ]; then put "$1" "$2" "$3"; return 0; fi
  if [ "${4-}" = show ] && ! cmp -s "$2" "$3"; then
    say "kept $3; the kit's copy differs:"
    diff -u "$3" "$2" || true
  fi
}

# Like put, but the new file must pass sshd -t, or the previous one comes back.
put_sshd() { # <source> <dest>
  local prev=$WORK/sshd-prev
  rm -f "$prev"
  if [ -f "$2" ]; then cp -p "$2" "$prev"; fi
  put 0644 "$1" "$2"
  [ "$CHANGED" = 1 ] || return 0
  if ! sshd -t; then
    if [ -f "$prev" ]; then cp -p "$prev" "$2"; else rm -f "$2"; fi
    die "sshd -t failed with $2: the previous file is back"
  fi
  SSH_CHANGED=1
}

ensure_users() {
  local u app
  getent group deployers >/dev/null || groupadd --system deployers
  if ! id -u ops >/dev/null 2>&1; then
    adduser --quiet --disabled-password --gecos '' --shell /bin/bash ops
    say "created ops, with no password yet: run passwd ops"
  fi
  usermod -aG sudo,systemd-journal ops
  install -d -m 0700 -o ops -g ops /home/ops/incoming
  # Forced commands run through the login shell, so these get /bin/sh; they have no password.
  # One deploy user per app conf present (its CI_USER).
  for app in $(conf_apps); do
    u=$(conf_val "$app" CI_USER)
    [ -n "$u" ] || continue
    if ! id -u "$u" >/dev/null 2>&1; then
      adduser --quiet --disabled-password --gecos '' --shell /bin/sh --ingroup deployers "$u"
      say "created $u"
    fi
    usermod -aG deployers "$u"
  done
}

# Only keys whose fingerprint was passed, and only added: a key the admin added by hand stays.
install_ops_keys() {
  local line t k c fp f=/home/ops/.ssh/authorized_keys
  [ "${#OPS_KEYS[@]}" -gt 0 ] || return 0
  install -d -m 0700 -o ops -g ops /home/ops/.ssh
  [ -e "$f" ] || install -m 0600 -o ops -g ops /dev/null "$f"
  if [ -s "$f" ] && [ -n "$(tail -c 1 "$f")" ]; then printf '\n' >>"$f"; fi
  for line in "${OPS_KEYS[@]}"; do
    read -r t k c <<<"$line"
    if ! grep -qF -- "$k" "$f"; then
      printf '%s\n' "$line" >>"$f"
      fp=$(fingerprint "$t" "$k")
      say "gave ops the key $fp${c:+ ($c)}"
    fi
  done
  chown ops:ops "$f"
  chmod 0600 "$f"
}

# Rewritten from the kit when the kit has keys for the user, so a key taken out of the kit is
# revoked here. A kit with no keys for a user (copied without keys/) leaves the installed file as
# it is: one run can't revoke every CI key. Root owns the files: a deploy user can't add a key.
install_deploy_keys() {
  local u app f old new
  mkdir -p /etc/ssh/authorized_keys.d
  for app in $(conf_apps); do
    u=$(conf_val "$app" CI_USER)
    [ -n "$u" ] || continue
    f=/etc/ssh/authorized_keys.d/$u
    if [ -z "${DEPLOY_KEYS[$u]-}" ]; then
      if [ -s "$f" ]; then
        warn "the kit has no keys for $u: its installed key file is left as it is (to revoke them, empty or remove $f)"
      fi
      continue
    fi
    old=0
    if [ -f "$f" ]; then old=$(grep -c . "$f" || true); fi
    printf '%s' "${DEPLOY_KEYS[$u]}" >"$WORK/authorized_keys"
    put 0644 "$WORK/authorized_keys" "$f"
    new=$(grep -c . "$WORK/authorized_keys" || true)
    if [ "$CHANGED" = 1 ] && [ "$new" -lt "$old" ]; then say "revoked $((old - new)) key(s) for $u"; fi
  done
}

install_scripts() {
  local s
  for s in "${SCRIPTS[@]}"; do
    if [ -f "$HOST_DIR/$s" ]; then put 0755 "$HOST_DIR/$s" "$SBIN/$s"; fi
  done
}

install_sudoers() {
  local src=$HOST_DIR/sudoers/app-deploy
  if [ ! -f "$src" ]; then
    warn "sudoers/app-deploy is not in the kit: the deploy users can't run app-deploy"
    return 0
  fi
  cp "$src" "$WORK/sudoers"
  visudo -cf "$WORK/sudoers" >/dev/null || die "visudo rejects $src"
  put 0440 "$src" /etc/sudoers.d/app-deploy
  # A broken file in sudoers.d would take sudo away from everyone: take it out again.
  if ! visudo -c >/dev/null; then
    rm -f /etc/sudoers.d/app-deploy
    die "visudo rejects the sudoers files with /etc/sudoers.d/app-deploy: removed it again"
  fi
}

install_docker_settings() {
  local dst=/etc/docker/daemon.json
  if [ -f "$dst" ] && ! cmp -s "$HOST_DIR/daemon.json" "$dst"; then
    if [ ! -e "$dst.bak" ]; then cp -p "$dst" "$dst.bak"; fi
    say "replacing $dst; the old one is kept as $dst.bak"
  fi
  put 0644 "$HOST_DIR/daemon.json" "$dst"
  if [ "$CHANGED" = 1 ]; then DOCKER_DIRTY=1; fi
}

install_journald_sysctl() {
  put 0644 "$HOST_DIR/journald/zz-retention.conf" /etc/systemd/journald.conf.d/zz-retention.conf
  if [ "$CHANGED" = 1 ]; then systemctl restart systemd-journald.service; fi
  put 0644 "$HOST_DIR/sysctl/90-server.conf" /etc/sysctl.d/90-server.conf
  if [ "$CHANGED" = 1 ]; then sysctl -q -p /etc/sysctl.d/90-server.conf; fi
}

# Every unit and drop-in under systemd/, so the other scripts' units come along. Only the firewall
# is enabled here; the timers wait for hostwatch.env and the backup settings, and the end of the run
# prints the commands that enable them (docs/runbooks/server.md §1).
install_units() {
  local f d name
  for f in "$HOST_DIR"/systemd/*.service "$HOST_DIR"/systemd/*.timer; do
    put 0644 "$f" "/etc/systemd/system/${f##*/}"
  done
  for d in "$HOST_DIR"/systemd/*.d; do
    name=${d##*/}
    for f in "$d"/*.conf; do
      put 0644 "$f" "/etc/systemd/system/$name/${f##*/}"
      if [ "$CHANGED" = 1 ]; then
        case $name in
          docker.service.d) DOCKER_DIRTY=1 ;;
          cloudflared.service.d) CLOUDFLARED_DIRTY=1 ;;
        esac
      fi
    done
  done
}

install_cf_ranges() {
  local list now cur had
  mkdir -p "$CF_DIR"
  for list in 4 6; do
    had=0
    if [ -f "$CF_DIR/ips-v$list.txt" ]; then had=1; fi
    put 0644 "$EDGE_DIR/cloudflare-ips-v$list.txt" "$CF_DIR/ips-v$list.txt"
    if [ "$had" = 1 ] && [ "$CHANGED" = 1 ]; then LISTS_CHANGED=1; fi
  done
  now=$(default_iface)
  if [ ! -f "$CF_DIR/iface" ]; then
    printf '%s\n' "$now" >"$WORK/iface"
    put 0644 "$WORK/iface" "$CF_DIR/iface"
  else
    read -r cur <"$CF_DIR/iface" || true
    if [ "$cur" != "$now" ]; then
      warn "the default route uses $now, but $CF_DIR/iface says $cur: fix it, then run cf-ranges firewall"
    fi
  fi
  if [ -n "$BOOTSTRAP_IP" ]; then
    printf '%s\n' "$BOOTSTRAP_IP" >"$WORK/bootstrap-ssh"
    put 0644 "$WORK/bootstrap-ssh" "$CF_DIR/bootstrap-ssh"
    if [ "$CHANGED" = 1 ]; then FW_RELOAD=1; fi
  fi
}

# /etc/apps/<app>.conf come from the kit once; the admin fills them in and install.sh never
# overwrites them. Each app's directory is created here, root-only.
install_apps() {
  local f name pd
  mkdir -p /etc/apps
  for f in "$HOST_DIR"/apps/*.conf; do
    name=${f##*/}
    name=${name%.conf}
    [[ $name =~ ^[a-z0-9]+$ ]] || die "bad app name: $f"
    bash -n "$f" || die "$f has a syntax error"
    put_once 0644 "$f" "/etc/apps/$name.conf" show
    # shellcheck source=/dev/null
    pd=$(unset PROJECT_DIR; . "/etc/apps/$name.conf"; printf '%s' "${PROJECT_DIR-}")
    case $pd in
      *..*) die "/etc/apps/$name.conf: PROJECT_DIR has a .." ;;
      /srv/?*) ;;
      *) die "/etc/apps/$name.conf: PROJECT_DIR must be under /srv" ;;
    esac
    if [ ! -d "$pd" ]; then
      install -d -m 0750 -o root -g root "$pd"
      say "created $pd"
    fi
  done
}

# The tree app-apply and cf-ranges expect (docs/runbooks/edge.md §1); the files in it come from
# app-apply and from the admin. The env files are copied from their examples once, and then
# never shown again: they hold secrets.
install_edge_and_env() {
  mkdir -p /srv
  install -d -m 0750 -o root -g root /srv/edge /srv/edge/certs
  install -d -m 0755 -o root -g root /srv/edge/config /srv/edge/config/sites /srv/edge/config/log-redact.d
  # The first Caddyfile and snippets.caddy: every app-apply edge command validates the whole tree,
  # which can't pass without them. Later changes go through app-apply edge config.
  for f in Caddyfile snippets.caddy; do
    if [ -f "$EDGE_DIR/config/$f" ]; then
      put_once 0644 "$EDGE_DIR/config/$f" "/srv/edge/config/$f"
    else
      warn "config/$f is not in the kit: no /srv/edge/config/$f"
    fi
  done
  if [ -f "$EDGE_DIR/edge.env.example" ]; then
    put_once 0600 "$EDGE_DIR/edge.env.example" /srv/edge/edge.env
    if [ "$CHANGED" = 1 ]; then say "fill in /srv/edge/edge.env"; fi
  else
    warn "edge.env.example is not in the kit: no /srv/edge/edge.env"
  fi
  if [ -f "$HOST_DIR/hostwatch.env.example" ]; then
    put_once 0600 "$HOST_DIR/hostwatch.env.example" /etc/hostwatch.env
    if [ "$CHANGED" = 1 ]; then say "fill in /etc/hostwatch.env"; fi
  else
    warn "hostwatch.env.example is not in the kit: no /etc/hostwatch.env"
  fi
}

check_sshd() {
  local out
  out=$(sshd -T -C user=deploy-jainav,host=localhost,addr=127.0.0.1)
  if ! grep -qix 'authorizedkeysfile /etc/ssh/authorized_keys.d/%u' <<<"$out" || ! grep -qix 'permittty no' <<<"$out"; then
    warn "sshd -T: the deploy users don't get their key file and PermitTTY no (10-users.conf)"
  fi
  out=$(sshd -T -C user=ops,host=localhost,addr=127.0.0.1)
  if ! grep -qix 'allowtcpforwarding local' <<<"$out"; then
    warn "sshd -T: ops may not forward ports (AllowTcpForwarding local)"
  fi
}

# The filters before Docker: the unit loads them (drop first), and Docker restarts only with
# filters that verify, because its drop-in refuses to start without them.
setup_firewall() {
  systemctl daemon-reload
  if systemctl is-active --quiet cf-ranges-firewall.service; then
    if [ "$FW_RELOAD" = 1 ] || ! "$SBIN/cf-ranges" verify >/dev/null 2>&1; then
      say "reloading the filters"
      "$SBIN/cf-ranges" firewall || die "cf-ranges firewall failed: journalctl -t cf-ranges -n 20"
    fi
  else
    DOCKER_DIRTY=1
    systemctl enable --now cf-ranges-firewall.service ||
      die "cf-ranges-firewall failed: journalctl -u cf-ranges-firewall -n 20"
  fi
  if [ "$LISTS_CHANGED" = 1 ] && [ -d /srv/edge/config ]; then
    say "the ranges changed: run cf-ranges apply, which also refreshes Caddy's trusted proxies"
  fi
  if ! systemctl cat docker.service >/dev/null 2>&1; then
    warn "docker.service is not installed: its settings apply when it first starts"
  elif [ "$DOCKER_DIRTY" = 1 ]; then
    "$SBIN/cf-ranges" verify >/dev/null || die "not restarting Docker: the filters don't verify (cf-ranges verify)"
    systemctl restart docker.service
    say "restarted docker"
  fi
}

# Hostinger's Ubuntu image adds the Monarx agent (a root file scanner with its own apt source, a key
# trusted for every source and a job that reinstalls it weekly) and cron jobs that prune Docker
# every night, deleting the rollback and tools images app-deploy keeps (docs/runbooks/server.md §1,
# step 4). A reinstall from hPanel brings them back, so every run looks for them.
check_image_leftovers() {
  local f
  local -a cron=(/etc/crontab /etc/cron.d/* /etc/cron.hourly/* /etc/cron.daily/* /etc/cron.weekly/*
    /etc/cron.monthly/* /var/spool/cron/crontabs/*)
  if dpkg-query -W -f='${Status}\n' 'monarx*' 2>/dev/null | grep -q 'install ok installed'; then
    warn "the Monarx agent is installed: remove it (docs/runbooks/server.md §1, step 4)"
  fi
  for f in /etc/apt/sources.list.d/*monarx* /etc/apt/trusted.gpg.d/*monarx* /etc/apt/keyrings/*monarx* \
    /usr/share/keyrings/*monarx* /etc/cron.d/*monarx* /etc/monarx*; do
    warn "Monarx left $f: remove it (docs/runbooks/server.md §1, step 4)"
  done
  # /etc/crontab is named even when it is missing, so grep never falls back to reading stdin.
  while IFS= read -r f; do
    warn "$f runs a Docker prune: remove it, app-deploy does its own cleanup (docs/runbooks/server.md §1, step 4)"
  done < <(grep -lsE 'docker[[:space:]]+([a-z]+[[:space:]]+)?prune' "${cron[@]}" || true)
}

report() {
  local members line pkg held
  say "--- iptables -S DOCKER-USER"
  iptables -S DOCKER-USER
  say "--- ip6tables -S DOCKER-USER"
  ip6tables -S DOCKER-USER
  say "--- cf-ranges verify"
  "$SBIN/cf-ranges" verify || warn "cf-ranges verify failed"
  say "--- journald"
  line=$(journalctl -u systemd-journald.service -n 20 -o cat --no-pager | { grep 'max ' || true; } | tail -n 1)
  case $line in
    *'max 24.0G'*) say "journald reports max 24.0G" ;;
    *) warn "journald does not report max 24.0G: check journalctl -u systemd-journald -n 5" ;;
  esac
  members=$(getent group docker | cut -d: -f4) || members=
  if [ -n "$members" ]; then warn "the docker group has members ($members): that is root"; fi
  # Docker comes from Docker's apt repository at pinned versions (docs/runbooks/server.md §1); a
  # held package never upgrades by itself.
  held=$(apt-mark showhold 2>/dev/null) || held=
  for pkg in docker-ce docker-ce-cli containerd.io docker-compose-plugin; do
    if dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed'; then
      grep -qxF -- "$pkg" <<<"$held" || warn "$pkg is installed but not held: apt-mark hold $pkg"
    fi
  done
  # Only those four: nothing builds images here, and Hostinger's image brings these two as well.
  for pkg in docker-buildx-plugin docker-ce-rootless-extras; do
    if dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed'; then
      warn "$pkg is installed: apt-get purge $pkg (docs/runbooks/server.md §1, step 5)"
    fi
  done
  check_image_leftovers
  if [ "${CLOUDFLARED_DIRTY:-0}" = 1 ] && systemctl cat cloudflared.service >/dev/null 2>&1; then
    say "restart cloudflared to apply its new drop-in (not done here: it would cut tunnel sessions)"
  fi
  if [ "$(passwd -S ops | awk '{ print $2 }')" != P ]; then say "next: run passwd ops (sudo asks for it)"; fi
}

# After hardening, SSH is reachable only through the tunnel: it must hold a connection first. A
# login as ops through the tunnel (it arrives from loopback) in this boot's journal, and a second
# key for ops, are warnings: the admin may be testing for the first time.
harden_tunnel_checks() { # <ops authorized_keys>
  local conns n=0 line t k login
  if [ "$TUNNEL_OPTIONAL" = 0 ]; then
    systemctl is-active --quiet cloudflared.service ||
      die "refusing to harden: cloudflared is not running (a rehearsal VM without a tunnel: --harden-without-tunnel)"
    conns=$(curl -fsS --max-time 5 http://127.0.0.1:20241/metrics 2>/dev/null |
      awk '$1 == "cloudflared_tunnel_ha_connections" { printf "%d", $2; exit }') || conns=
    [ "${conns:-0}" -ge 1 ] ||
      die "refusing to harden: cloudflared holds no connection to Cloudflare (cloudflared_tunnel_ha_connections is ${conns:-missing})"
    login=$(journalctl -b -q --no-pager -t sshd -t sshd-session -o cat \
      --grep 'Accepted publickey for ops from (127\.0\.0\.1|::1) ' 2>/dev/null) || login=
    [ -n "$login" ] ||
      warn "no login as ops through the tunnel in this boot's journal: open one (ssh through Cloudflare Access) and run this again"
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    read -r t k _ <<<"$(key_fields "$line")"
    if [ -n "$k" ]; then n=$((n + 1)); fi
  done <"$1"
  [ "$n" -ge 2 ] || warn "ops has $n key(s): add a second one before relying on key-only login"
}

# The timers stay off until hostwatch.env and the backup settings are filled in: print the command
# for each one that is not enabled yet.
print_timer_commands() {
  local app t
  local -a want=(hostwatch.timer hostwatch-daily.timer cf-ranges-check.timer) off=()
  for app in $(conf_apps); do
    if [ -n "$(conf_val "$app" CONFIG_ARCHIVE_FILES)" ]; then want+=("app-config-archive@$app.timer"); fi
  done
  for t in "${want[@]}"; do
    systemctl is-enabled --quiet "$t" 2>/dev/null || off+=("$t")
  done
  [ "${#off[@]}" -gt 0 ] || return 0
  say "--- timers (enable by hand once hostwatch.env and the backup settings are filled in)"
  for t in "${off[@]}"; do say "systemctl enable --now $t"; done
}

# Last, and only on request. Every step before the switch can be undone by removing the file.
do_harden() {
  local f=$SSHD_D/00-hardening.conf keys=/home/ops/.ssh/authorized_keys listeners mode
  id -u ops >/dev/null 2>&1 || die "refusing to harden: there is no ops account"
  [ -s "$keys" ] || die "refusing to harden: ops has no authorized key"
  ssh-keygen -lf "$keys" >/dev/null || die "refusing to harden: $keys holds no valid key"
  # sshd's StrictModes ignores a key file that anyone but its owner can write.
  [ "$(stat -c %U "$keys")" = ops ] || die "refusing to harden: $keys is not owned by ops"
  mode=$(stat -c %a "$keys")
  if (((8#$mode & 8#022) != 0)); then die "refusing to harden: $keys is writable by others"; fi
  [ "$(passwd -S ops | awk '{ print $2 }')" = P ] ||
    die "refusing to harden: ops has no password and sudo asks for one (run passwd ops)"
  [ -f "$SSHD_D/10-users.conf" ] || die "refusing to harden: 10-users.conf is not installed"
  sshd -t || die "refusing to harden: sshd -t fails"
  harden_tunnel_checks "$keys"
  put_sshd "$HOST_DIR/ssh/00-hardening.conf" "$f"
  sshd -t || die "refusing to harden: sshd -t fails with $f"
  if systemctl is-enabled --quiet ssh.socket 2>/dev/null || systemctl is-active --quiet ssh.socket; then
    systemctl disable --now ssh.socket
    SSH_CHANGED=1
  fi
  systemctl enable --now ssh.service
  if [ "$SSH_CHANGED" = 1 ]; then systemctl restart ssh.service; fi
  sleep 1
  listeners=$(ss -H -tln 'sport = :22' | awk '{ print $4 }')
  if ! grep -Eq '^(127\.0\.0\.1|\[::1\]):22$' <<<"$listeners" || public_ssh_listener; then
    # Back to how it was: the socket listens, and the hardening file is gone.
    rm -f "$f"
    systemctl stop ssh.service || true
    systemctl enable --now ssh.socket || true
    die "sshd is not listening on loopback only; the hardening is undone and ssh.socket is back"
  fi
  rm -f "$CF_DIR/bootstrap-ssh"
  "$SBIN/cf-ranges" firewall || die "cf-ranges firewall failed: journalctl -t cf-ranges -n 20"
  log "hardened: root login off, passwords off, sshd on loopback only, bootstrap allowance removed"
  say "--- hardened"
  ss -tlnp | grep ':22 ' || true
  sshd -T -C user=ops,host=localhost,addr=127.0.0.1 | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|authenticationmethods|allowgroups|allowtcpforwarding) ' || true
  say "now open a fresh session as ops through the tunnel and run sudo -v before closing this one"
}

log "started (harden=$HARDEN)"
preflight
ensure_users
install_ops_keys
install_deploy_keys
install_scripts
install_sudoers
install_docker_settings
install_journald_sysctl
install_units
install_cf_ranges
install_apps
install_edge_and_env
put_sshd "$HOST_DIR/ssh/10-users.conf" "$SSHD_D/10-users.conf"
if [ "$SSH_CHANGED" = 1 ]; then
  sshd -t || die "sshd -t fails: not reloading sshd"
  systemctl try-reload-or-restart ssh.service
fi
check_sshd
setup_firewall
report
if [ "$HARDEN" = 1 ]; then do_harden; fi
print_timer_commands
log "done, $WARNINGS warning(s)"
say "install.sh: done, $WARNINGS warning(s)"
