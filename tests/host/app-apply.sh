#!/bin/bash
# Runs the checks of docker/host/app-apply on the repo's own files, so a change to a compose file or
# to the edge config that the server would refuse fails here and not at the first install. It
# sources app-apply's functions (APP_APPLY_SOURCE_ONLY=1), so the rules under test are the ones
# root runs, and needs neither root nor a server:
#   - the text checks on docker/compose.prod.yml and docker/edge/compose.yml, and on small files
#   - Compose's JSON of both files with dummy env files, through every jq rule that needs no root
#     (needs docker compose and jq), and the rules on hand-written JSON (needs jq)
#   - edge.env (the parse of every edge command, app-apply edge env's hash check, and
#     edge_env_hash_check, which other apps' kit checks call) and log-redact files
#   - swap_in under INT, TERM and a terminal that takes no writes, with a time limit on every docker
#     call (docker is a stand-in)
#   - docker/edge/config and the Jainav site file through the pinned Caddy: validate (also of the
#     tree at bootstrap, with edge.env.example), the site file's checks, a log-redact file, and a
#     second app's site whose tls_menumesh has client_auth on (needs docker, the pinned image and
#     openssl)
# A part whose tool is missing prints a "skip -" line. CI runs it on ubuntu-24.04; Git Bash runs it
# too (without jq).
#   bash tests/host/app-apply.sh
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d)
# The directory as Docker sees it: Git Bash on Windows needs C:/... for a bind mount.
T=$(cd "$T" && { pwd -W 2>/dev/null || pwd; })
trap 'rm -rf "$T"' EXIT
export MSYS_NO_PATHCONV=1
mkdir -p "$T/cases"

have_jq=0
if command -v jq >/dev/null 2>&1; then have_jq=1; fi
have_compose=0
if docker compose version >/dev/null 2>&1; then have_compose=1; fi

checks=0 failed=0
ok() { checks=$((checks + 1)); printf 'ok - %s\n' "$1"; }
bad() { # bad <name> <what> <output>
  checks=$((checks + 1))
  failed=$((failed + 1))
  printf 'not ok - %s: %s\n' "$1" "$2"
  if [ -n "${3-}" ]; then printf '%s\n' "$3" | sed 's/^/    | /'; fi
}
expect_clean() { # expect_clean <name> <what the checks printed>
  if [ -z "$2" ]; then ok "$1"; else bad "$1" "refused, but should pass" "$2"; fi
}
expect_refused() { # expect_refused <name> <what the checks printed> <text it must hold>
  if [ -z "$2" ]; then
    bad "$1" "passed, but should be refused"
  elif [[ $2 == *"$3"* ]]; then
    ok "$1"
  else
    bad "$1" "refused, but not for: $3" "$2"
  fi
}
skip() { printf 'skip - %s\n' "$1"; }

# In a subshell: app-apply's functions, with what sourcing changes put back and the commands that
# need a server stubbed. work is a fresh directory with an empty problems file.
# shellcheck disable=SC2317,SC2329 # clean, journal, logger and env_prefixes are called by app-apply's functions
setup_lib() {
  local path=$PATH
  # shellcheck source=/dev/null
  APP_APPLY_SOURCE_ONLY=1 . "$root/docker/host/app-apply"
  PATH=$path
  set +eu
  clean() { "$@"; }
  journal() { cat >/dev/null; }
  logger() { :; }
  env_prefixes() { echo 'JAINAV_ '; }
  work=$(mktemp -d "$T/work.XXXXXX")
  : >"$work/problems"
  mkdir -p "$work/empty"
}

# A project directory with dummy env files for every variable the compose file names.
prepare_project() { # prepare_project <app> <compose file>
  local dir=$T/srv/$1
  mkdir -p "$dir/postgres" "$dir/backup-out"
  : >"$dir/production.env"
  : >"$dir/staging.env"
  : >"$dir/edge.env"
  : >"$dir/postgres/roles.sh"
  { grep -oE '[$][{][A-Z_0-9]+' "$2" || true; } | sed -e 's/^..//' -e 's/$/=dummy/' | sort -u >"$dir/.env"
  cp "$root/docker/images.env.example" "$dir/images.env"
}

# --- the text checks ---

text_case() { # text_case <app> <file>: what check_compose_text refuses
  (
    setup_lib
    project=$1
    check_compose_text "$2"
    cat "$work/problems"
  )
}
yml() { # yml <name> <line>...: a small compose file under $T/cases
  local f=$T/cases/$1.yml
  shift
  printf '%s\n' "$@" >"$f"
  printf '%s' "$f"
}

expect_clean 'text: docker/compose.prod.yml' "$(text_case jainav "$root/docker/compose.prod.yml")"
expect_clean 'text: docker/edge/compose.yml' "$(text_case edge "$root/docker/edge/compose.yml")"
head='name: jainav'
expect_clean 'text: a ternary in a quoted healthcheck' \
  "$(text_case jainav "$(yml ternary "$head" 'services:' '  a:' '    healthcheck:' '      test: ["CMD", "node", "-e", "fetch(u).then((r) => process.exit(r.ok ? 0 : 1))"]')")"
expect_clean 'text: a ? in a quoted SQL string and in a comment' \
  "$(text_case jainav "$(yml sql "$head" 'services:' '  a:' '    command: ["psql", "-c", "select * from t where a = ? or b = ?"] # why ? not')")"
expect_clean 'text: the name in quotes' "$(text_case jainav "$(yml quoted "name: 'jainav' # the project" 'services: {}')")"
expect_refused 'text: include' "$(text_case jainav "$(yml include "$head" 'services:' '  a:' '    include: other.yml')")" 'include and extends'
expect_refused 'text: extends' "$(text_case jainav "$(yml extends "$head" 'services:' '  a:' '    extends:' '      service: b')")" 'include and extends'
expect_refused 'text: a complex key' "$(text_case jainav "$(yml cplx "$head" 'services:' '  ? a' '  : b')")" 'complex keys'
expect_refused 'text: a complex key in a list' "$(text_case jainav "$(yml cplx2 "$head" 'services:' '  - ? a')")" 'complex keys'
expect_refused 'text: a complex key in a flow mapping' "$(text_case jainav "$(yml cplx3 "$head" 'services: { ? a : b }')")" 'complex keys'
expect_refused 'text: a complex key in a flow sequence' "$(text_case jainav "$(yml cplx4 "$head" 'services: [ ? a : b ]')")" 'complex keys'
expect_refused 'text: an alias as a key' "$(text_case jainav "$(yml alias "$head" 'x-a: &a 1' 'services:' '  *a : b')")" 'alias'
expect_refused 'text: another project name' "$(text_case jainav "$(yml other 'name: menumesh' 'services: {}')")" 'project name must be jainav'
# shellcheck disable=SC2016 # ${MM_NAME:-jainav} is compose text under test, not for this shell to expand
expect_refused 'text: an interpolated project name' "$(text_case jainav "$(yml namevar 'name: ${MM_NAME:-jainav}' 'services: {}')")" 'project name must be jainav'
expect_refused 'text: a top-level key' "$(text_case jainav "$(yml top "$head" 'configs:' '  c: {}')")" 'top-level keys'

# --- env files and log-redact files ---

env_case() { # env_case <content>: what edge_env_parse, the parse of every edge command, refuses
  (
    setup_lib
    printf '%s\n' "$1" >"$work/e.env"
    edge_env_parse "$work/e.env" "$work/edge"
    cat "$work/problems"
  )
}
# A bcrypt hash as caddy hash-password prints it ($2a$, the cost, $ and 53 characters), of nothing.
fake_hash="\$2a\$14\$./0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO"
example=$(cat "$root/docker/edge/edge.env.example")
expect_clean 'edge.env: an app variable' "$(env_case 'JAINAV_DOMAIN=example.test')"
expect_clean 'edge.env: a quoted hash' "$(env_case "JAINAV_STAGING_AUTH_HASH='$fake_hash'")"
# At bootstrap cf-ranges apply validates the tree while edge.env is still the example.
expect_clean 'edge.env: edge.env.example, placeholder hash and all' "$(env_case "$example")"
expect_refused 'edge.env: CADDY_ADMIN' "$(env_case 'CADDY_ADMIN=0.0.0.0:2019')" 'starts with no app'
expect_refused 'edge.env: HTTP_PROXY' "$(env_case 'HTTP_PROXY=http://jainav-app:3000')" 'starts with no app'
expect_refused 'edge.env: COMPOSE_PROJECT_NAME' "$(env_case 'COMPOSE_PROJECT_NAME=jainav')" 'starts with no app'
expect_refused 'edge.env: a value with a space' "$(env_case 'JAINAV_DOMAIN=a b')" 'plain'

# app-apply edge env adds the hash check to the parse; app-apply edge validate only warns.
install_case() { # install_case <content>: what app-apply edge env refuses before the site and Caddy checks
  (
    setup_lib
    printf '%s\n' "$1" >"$work/e.env"
    edge_env_parse "$work/e.env" "$work/edge"
    check_auth_hashes "$work/edge"
    cat "$work/problems"
  )
}
warn_case() { # warn_case <content>: what app-apply edge validate prints after "the live edge tree is valid"
  (
    setup_lib
    printf '%s\n' "$1" >"$work/e.env"
    edge_env_parse "$work/e.env" "$work/edge"
    warn_auth_hashes "$work/edge"
    if [ -s "$work/problems" ]; then echo 'a problem is left behind, so validate would fail'; fi
  )
}
with_hash() { # with_hash <value>: edge.env.example with that value for JAINAV_STAGING_AUTH_HASH
  grep -v '^JAINAV_STAGING_AUTH_HASH=' <<<"$example"
  printf 'JAINAV_STAGING_AUTH_HASH=%s\n' "$1"
}
nohash='JAINAV_STAGING_AUTH_HASH holds no bcrypt hash'
expect_clean 'edge env: edge.env.example with a hash in place' "$(install_case "$(with_hash "'$fake_hash'")")"
expect_refused 'edge env: the placeholder of edge.env.example' "$(install_case "$example")" "$nohash"
expect_refused 'edge env: a hash one character short' "$(install_case "$(with_hash "'${fake_hash%?}'")")" "$nohash"
expect_refused 'edge env: no hash between the quotes' "$(install_case "$(with_hash "''")")" "$nohash"
expect_refused 'edge env: an empty hash' "$(install_case "$(with_hash '')")" "$nohash"
out=$(warn_case "$example")
if [[ $out == "warning: $nohash"* && $out != *$'\n'* ]]; then
  ok 'edge validate: warns of the placeholder, and passes'
else
  bad 'edge validate: warns of the placeholder, and passes' 'no warning, or more than one line' "$out"
fi
expect_clean 'edge validate: no warning with a hash in place' "$(warn_case "$(with_hash "'$fake_hash'")")"

# edge_env_hash_check, for other apps' kit checks: the same two checks in a work directory of its
# own, which it removes; the caller's stays as it was.
hash_check() { # hash_check <content>: its problems, its status, and what it left behind
  (
    setup_lib
    printf '%s\n' "$1" >"$work/e.env"
    mine=$work
    TMPDIR=$work/tmp
    export TMPDIR
    mkdir "$TMPDIR"
    # Not in $(...): a work it set without local would then stay set here.
    edge_env_hash_check "$work/e.env" >"$mine/out"
    st=$?
    cat "$mine/out"
    echo "status $st"
    if [ "$work" != "$mine" ]; then echo "work is no longer the caller's"; fi
    if [ -s "$work/problems" ]; then echo "the caller's problems file is not empty"; fi
    if [ -n "$(ls -A "$TMPDIR")" ]; then echo 'its work directory is left behind'; fi
  )
}
expect_hash_check() { # expect_hash_check <name> <content> [<text its refusal must hold>]
  local out
  out=$(hash_check "$2")
  if [ -z "${3-}" ]; then
    if [ "$out" = 'status 0' ]; then ok "$1"; else bad "$1" 'refused, or left something behind' "$out"; fi
  elif [[ $out == *"$3"* && $out == *$'\n''status 1' ]]; then
    ok "$1"
  else
    bad "$1" "not refused for: $3, or left something behind" "$out"
  fi
}
expect_hash_check 'kit check: the placeholder of edge.env.example' "$example" "$nohash"
expect_hash_check 'kit check: a bcrypt hash of version 2a' "$(with_hash "'$fake_hash'")"
expect_hash_check 'kit check: a bcrypt hash of version 2b' "$(with_hash "'\$2b${fake_hash#\$2a}'")"
expect_hash_check 'kit check: a bcrypt hash of version 2y' "$(with_hash "'\$2y${fake_hash#\$2a}'")"
expect_hash_check 'kit check: a name without an app prefix' 'CADDY_ADMIN=0.0.0.0:2019' 'starts with no app'
st=0
(
  setup_lib
  edge_env_hash_check 2>/dev/null
) || st=$?
if [ "$st" = 2 ]; then ok 'kit check: no file named is a usage error'; else bad 'kit check: no file named is a usage error' "exit $st"; fi

redact_case() { # redact_case <content>: what check_redact_text refuses
  (
    setup_lib
    printf '%s\n' "$1" >"$work/r.caddy"
    check_redact_text "$work/r.caddy"
    cat "$work/problems"
  )
}
expect_clean 'redact: one regexp line' "$(redact_case 'request>uri regexp ^/k/[A-Za-z0-9]+ /k/_')"
expect_clean 'redact: comments, blank lines and a group' \
  "$(redact_case $'# a token path\n\nrequest>uri regexp ^/x/([a-z]+)(/|$) /x/_${1}')"
expect_refused 'redact: another directive' "$(redact_case 'header_up X-Test 1')" 'request>uri regexp'
expect_refused 'redact: a third argument' "$(redact_case 'request>uri regexp a b c')" 'request>uri regexp'
# shellcheck disable=SC2016 # {$X} is a Caddy placeholder under test, not for this shell to expand
expect_refused 'redact: an env placeholder' "$(redact_case 'request>uri regexp {$X} y')" 'environment or files'
expect_refused 'redact: a file placeholder' "$(redact_case 'request>uri regexp a {file./etc/passwd}')" 'environment or files'
expect_refused 'redact: a quote' "$(redact_case 'request>uri regexp "a" b')" 'quotes'

# --- the argument parser ---

set +e
out=$(bash "$root/docker/host/app-apply" 2>&1)
st=$?
set -e
if [ "$st" = 2 ] && [[ $out == *'edge redact <app> <file>'* ]]; then ok 'usage lists edge redact'; else bad 'usage lists edge redact' "exit $st" "$out"; fi
set +e
out=$(bash "$root/docker/host/app-apply" edge redact nosuchapp /dev/null 2>&1)
st=$?
set -e
if [ "$st" = 2 ] && [[ $out == *'unknown app nosuchapp'* ]]; then ok 'edge redact needs a configured app'; else bad 'edge redact needs a configured app' "exit $st" "$out"; fi

# --- the swap ---

# swap_in as app-apply edge cert runs it, on a certificate and its key: under app-apply's traps and
# set -euo pipefail, with INT and TERM sent after every file it moves, and a terminal that takes no
# writes (/dev/full, like an SSH session that is gone). docker stands in for edge-caddy-1, whose
# first <n> reloads fail, and each call to it must come with a time limit: nothing else ends a hung
# one while INT and TERM are ignored. Prints what went wrong.
# shellcheck disable=SC2317,SC2329 # clean and mv are called by app-apply's functions
swap_case() { # swap_case <reloads that fail: 0 or 1>
  (
    setup_lib
    fails=$1
    # The path in the shell's own form: keep_previous puts the live path under KEEP_DIR.
    s=$(cd "$T" && pwd)/swap$fails
    # shellcheck disable=SC2034 # read by keep_previous in app-apply, sourced in setup_lib
    KEEP_DIR=$s/keep
    live=$s/edge/certs/x
    mkdir -p "$live"
    echo old-cert >"$live/origin.pem"
    echo old-key >"$live/origin-key.pem"
    echo new-cert >"$work/origin.pem"
    echo new-key >"$work/origin-key.pem"
    : >"$work/edge.docker"
    : >"$s/reloads"
    : >"$s/untimed"
    clean() {
      if [ "$1" = timeout ]; then
        shift 2
      elif [ "$1" = docker ]; then
        echo "docker $2 runs without a time limit" >>"$s/untimed"
      fi
      case "$1 $2" in
        'docker inspect') if [[ $4 == *Running* ]]; then echo true; fi ;;
        'docker exec')
          echo reload >>"$s/reloads"
          [ "$(grep -c . "$s/reloads")" -gt "$fails" ]
          ;;
        *) "$@" ;;
      esac
    }
    mv() {
      command mv "$@"
      kill -INT "$BASHPID"
      kill -TERM "$BASHPID"
    }
    (
      set -euo pipefail
      exit_on_signals
      swap_in "$work/origin.pem" "$live/origin.pem" 0644 \
        "$work/origin-key.pem" "$live/origin-key.pem" 0600 >/dev/full 2>&1
      if [ "$(trap -p INT TERM)" != "$(exit_on_signals; trap -p INT TERM)" ]; then
        echo "INT and TERM are not app-apply's traps again"
      fi
    )
    st=$?
    want=new want_st=0 want_reloads=1
    if [ "$fails" = 1 ]; then want=old want_st=1 want_reloads=2; fi
    if [ "$st" != "$want_st" ]; then echo "swap_in ended with exit $st, not $want_st"; fi
    if [ "$(cat "$live/origin.pem")" != "$want-cert" ]; then echo "origin.pem is not the $want one"; fi
    if [ "$(cat "$live/origin-key.pem")" != "$want-key" ]; then echo "origin-key.pem is not the $want one"; fi
    reloads=$(grep -c . "$s/reloads")
    if [ "$reloads" != "$want_reloads" ]; then echo "Caddy reloaded $reloads times, not $want_reloads"; fi
    if [ -s "$s/untimed" ]; then sort -u "$s/untimed"; fi
  )
}
expect_swap() { # expect_swap <name> <what swap_case printed>
  if [ -z "$2" ]; then ok "$1"; else bad "$1" 'the swap went wrong' "$2"; fi
}
expect_swap 'swap: a certificate and its key go in together' "$(swap_case 0)"
expect_swap 'swap: a failed reload puts both back' "$(swap_case 1)"

# --- Compose's JSON of the repo's files, through the jq rules ---

# Every check that needs neither root nor a daemon, in the order of cmd_compose.
repo_case() { # repo_case <app> <compose file>: what the checks refuse
  local app=$1 file=$2
  prepare_project "$app" "$file"
  (
    setup_lib
    # shellcheck source=/dev/null
    . "$root/docker/host/apps/$app.conf"
    project=$app
    # shellcheck disable=SC2034 # read by compose_json in app-apply, sourced in setup_lib
    PROJECT_DIR=$T/srv/$app
    allowed_edge=$EDGE_NETWORKS
    other_apps='menumesh '
    if [ "$app" = edge ]; then extra_keys=ports; fi
    cp "$file" "$work/compose.yml"
    check_compose_text "$work/compose.yml"
    if ! compose_json "$work/compose.yml" "$work/config.json" || ! compose_json "$work/compose.yml" "$work/raw.json" raw; then
      echo "docker compose could not read the file:"
      cat "$work/config.json.err" "$work/raw.json.err" 2>/dev/null
      exit 0
    fi
    check_interpolation "$work/raw.json"
    check_top_level
    check_volumes
    check_networks
    if [ "$app" = edge ]; then
      check_edge_aliases
      check_ports
      check_edge_image
    else
      check_edge_members
    fi
    check_service_keys
    check_mounts
    check_caps
    check_security_opt
    check_limits
    check_restart
    # Compose prints Windows paths for the binds when this runs in Git Bash: not absolute to jq.
    case $(uname -s) in
      MINGW* | MSYS*) grep -v ' is not an absolute path$' "$work/problems" || true ;;
      *) cat "$work/problems" ;;
    esac
  )
}

if [ "$have_jq" = 1 ] && [ "$have_compose" = 1 ]; then
  expect_clean 'compose: docker/compose.prod.yml, as app-apply reads it' "$(repo_case jainav "$root/docker/compose.prod.yml")"
  expect_clean 'compose: docker/edge/compose.yml, as app-apply reads it' "$(repo_case edge "$root/docker/edge/compose.yml")"
else
  skip 'the repo compose files through the jq rules (needs jq and docker compose)'
fi

# The rules on JSON written by hand, for what the repo's files do not use.
rules_case() { # rules_case <json file> <app> <function>...: what the checks refuse
  local json=$1 app=$2
  shift 2
  (
    setup_lib
    project=$app
    UPSTREAMS='jainav-app:3000'
    allowed_edge='edge-jainav edge-jainav-staging'
    other_apps='menumesh '
    extra_keys=
    CADDY_IMAGE=caddy:test
    cp "$json" "$work/config.json"
    local f
    for f in "$@"; do "$f"; done
    cat "$work/problems"
  )
}
interp_case() { # interp_case <json file>: check_interpolation on raw JSON
  (
    setup_lib
    # shellcheck disable=SC2034 # read by jqc in app-apply, sourced in setup_lib
    project=jainav
    # shellcheck disable=SC2034 # read by jqc in app-apply, sourced in setup_lib
    UPSTREAMS='' allowed_edge='' other_apps='' extra_keys='' CADDY_IMAGE=''
    cp "$1" "$work/raw.json"
    check_interpolation "$work/raw.json"
    cat "$work/problems"
  )
}
svc() { # svc <more members of the service, as JSON>: a config with one service that passes check_limits
  printf '{"name":"jainav","services":{"app":{"image":"x:1","restart":"unless-stopped","cap_drop":["ALL"],"mem_limit":268435456,"memswap_limit":268435456,"cpus":1,"pids_limit":100%s}}}' "${1:+,$1}"
}
json() { # json <name> <content>: a file under $T/cases
  printf '%s' "$2" >"$T/cases/$1.json"
  printf '%s' "$T/cases/$1.json"
}

if [ "$have_jq" = 1 ]; then
  expect_clean 'limits: oom_score_adj left out (Compose drops 0)' "$(rules_case "$(json lim1 "$(svc)")" jainav check_limits)"
  expect_refused 'limits: oom_score_adj below -900' "$(rules_case "$(json lim2 "$(svc '"oom_score_adj":-1000')")" jainav check_limits)" 'oom_score_adj'
  expect_refused 'limits: pids_limit above 2048' "$(rules_case "$(json lim3 "$(svc | sed 's/"pids_limit":100/"pids_limit":5000/')")" jainav check_limits)" 'pids_limit'
  expect_refused 'limits: cpu_shares above 1024' "$(rules_case "$(json lim4 "$(svc '"cpu_shares":4096')")" jainav check_limits)" 'cpu_shares'
  expect_refused 'limits: cpus above 1.5' "$(rules_case "$(json lim5 "$(svc | sed 's/"cpus":1/"cpus":3/')")" jainav check_limits)" 'cpus'
  expect_clean 'keys: ulimits nofile and nproc' "$(rules_case "$(json key1 "$(svc '"ulimits":{"nofile":{"soft":1024,"hard":2048},"nproc":512}')")" jainav check_service_keys)"
  expect_refused 'keys: ulimits rtprio' "$(rules_case "$(json key2 "$(svc '"ulimits":{"rtprio":99}')")" jainav check_service_keys)" 'ulimit rtprio'
  expect_refused 'keys: privileged' "$(rules_case "$(json key3 "$(svc '"privileged":true')")" jainav check_service_keys)" 'privileged is not allowed'
  ext='{"name":"jainav","services":{},"networks":{"edge-jainav":{"name":"edge-jainav","ipam":{},"external":true}}}'
  expect_clean 'networks: an external network with the empty ipam Compose prints' "$(rules_case "$(json net1 "$ext")" jainav check_networks)"
  ipam='{"name":"jainav","services":{},"networks":{"edge-jainav":{"name":"edge-jainav","ipam":{"config":[{"subnet":"10.0.0.0/8"}]},"external":true}}}'
  expect_refused 'networks: an external network with an ipam config' "$(rules_case "$(json net2 "$ipam")" jainav check_networks)" 'sets ipam'
  expect_refused 'networks: another app'"'"'s edge network' \
    "$(rules_case "$(json net3 "${ext//edge-jainav/edge-menumesh}")" jainav check_networks)" 'is not one of'
  # shellcheck disable=SC2016 # the ${...} in the JSON is text for check_interpolation to find, not for this shell
  expect_refused 'interpolation: privileged from the env files' \
    "$(interp_case "$(json int1 '{"name":"jainav","services":{"app":{"image":"${APP_IMAGE:?x}","privileged":"${MM_PRIV:-false}"}}}')")" 'privileged takes a value'
  # shellcheck disable=SC2016 # the ${...} in the JSON is text for check_interpolation to find, not for this shell
  expect_refused 'interpolation: a bind source from the env files' \
    "$(interp_case "$(json int2 '{"name":"jainav","services":{"app":{"image":"x","volumes":["${MM_CFG:-./config}:/cfg:ro"]}}}')")" 'volumes takes a value'
  # shellcheck disable=SC2016 # the ${...} in the JSON is text for check_interpolation to find, not for this shell
  expect_refused 'interpolation: a network name from the env files' \
    "$(interp_case "$(json int3 '{"name":"jainav","services":{},"networks":{"n":{"name":"${MM_NET}"}}}')")" 'n takes a value'
  # shellcheck disable=SC2016 # the ${...} in the JSON is text for check_interpolation to find, not for this shell
  expect_clean 'interpolation: image, environment, command and healthcheck' \
    "$(interp_case "$(json int4 '{"name":"jainav","services":{"app":{"image":"${APP_IMAGE:?x}","environment":{"A":"${B:-c}"},"command":["sh","-c","echo $${HOME}"],"healthcheck":{"test":["CMD","true","${X}"]},"x-note":"${Y}"}}}')")"
else
  skip 'the jq rules on hand-written JSON (jq is not installed)'
fi

# --- the edge config through the pinned Caddy ---

image=$(sed -n 's/^    image: \(caddy:[^ ]*\)$/\1/p' "$root/docker/edge/compose.yml")
caddy_ready=0
if [ -z "$image" ]; then
  bad 'caddy: the image in docker/edge/compose.yml' 'not found'
elif ! command -v openssl >/dev/null 2>&1; then
  skip "caddy validate of docker/edge/config (openssl is not installed)"
elif ! docker info >/dev/null 2>&1; then
  skip "caddy validate of docker/edge/config (docker is not running)"
elif docker image inspect "$image" >/dev/null 2>&1 || { [ -n "${CI-}" ] && docker pull -q "$image" >/dev/null; }; then
  caddy_ready=1
else
  skip "caddy validate of docker/edge/config ($image is not present)"
fi

if [ "$caddy_ready" = 1 ]; then
  cfg=$T/caddy/config
  certs=$T/caddy/certs
  mkdir -p "$cfg" "$certs/jainav"
  cp -r "$root/docker/edge/config/." "$cfg/"
  openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj '/CN=example.test' \
    -keyout "$certs/jainav/origin-key.pem" -out "$certs/jainav/origin.pem" 2>/dev/null
  # Caddy runs as root without DAC_OVERRIDE. On the server root owns the real key; here the
  # runner's user owns this throwaway one, so it must be readable by everyone.
  chmod 0644 "$certs/jainav/origin-key.pem"
  # bcrypt, as docs/runbooks/server.md §2 makes it: app-apply edge env takes no other hash.
  hash=$(docker run --rm "$image" caddy hash-password --algorithm bcrypt --plaintext 'test-only')
  {
    echo 'JAINAV_DOMAIN=example.test'
    echo 'JAINAV_STAGING_AUTH_USER=jainav'
    printf "JAINAV_STAGING_AUTH_HASH='%s'\n" "$hash"
  } >"$T/caddy/edge.env"
  expect_clean 'edge env: the hash the pinned caddy hash-password prints' "$(install_case "$(cat "$T/caddy/edge.env")")"
  expect_hash_check 'kit check: the hash the pinned caddy hash-password prints' "$(cat "$T/caddy/edge.env")"

  # edge.env as app-apply parses it, then the whole tree through its own tree_validate.
  tree_case() { # tree_case <config dir> [<edge.env> <certs dir>]: what tree_validate refuses
    (
      setup_lib
      CADDY_IMAGE=$image
      edge_env_parse "${2:-$T/caddy/edge.env}" "$work/edge"
      tree_validate "$1" "${3:-$certs}" "$work/edge.docker"
      cat "$work/problems"
    )
  }
  # The tree as cf-ranges apply validates it at bootstrap: install.sh's Caddyfile and snippets, the
  # ranges file, no site file and no certificate yet, and edge.env still the example.
  boot=$T/caddy/boot
  mkdir -p "$boot/config/sites" "$boot/config/log-redact.d" "$boot/certs"
  cp "$root/docker/edge/config/Caddyfile" "$root/docker/edge/config/snippets.caddy" \
    "$root/docker/edge/config/cloudflare-ranges.caddy" "$boot/config/"
  expect_clean 'caddy: the tree at bootstrap validates with edge.env.example' \
    "$(tree_case "$boot/config" "$root/docker/edge/edge.env.example" "$boot/certs")"
  expect_clean 'caddy: docker/edge/config validates (no log-redact.d)' "$(tree_case "$cfg")"
  mkdir -p "$cfg/log-redact.d"
  echo 'request>uri regexp ^/k/[A-Za-z0-9]+ /k/_' >"$cfg/log-redact.d/test.caddy"
  expect_clean 'caddy: docker/edge/config validates with a log-redact file' "$(tree_case "$cfg")"
  echo 'request>uri regexp (unclosed x' >"$cfg/log-redact.d/test.caddy"
  expect_refused 'caddy: a broken log-redact file fails validate' "$(tree_case "$cfg")" 'caddy validate failed'
  rm -rf "$cfg/log-redact.d"

  # The Jainav site file through its text check (and, with jq, the check of Caddy's adapted JSON).
  site_case() { # site_case: what the site file's checks refuse
    (
      setup_lib
      # shellcheck disable=SC2034 # read by caddy_run in app-apply, sourced in setup_lib
      CADDY_IMAGE=$image
      # shellcheck source=/dev/null
      . "$root/docker/host/apps/jainav.conf"
      # shellcheck disable=SC2034 # read by site_json_check in app-apply, sourced in setup_lib
      ZONE=example.test
      edge_env_parse "$T/caddy/edge.env" "$work/edge"
      site_text_check jainav "$cfg/sites/jainav.caddy" "$work/edge.keys"
      if [ "$have_jq" = 1 ]; then site_json_check jainav "$cfg/sites/jainav.caddy" "$cfg/snippets.caddy" "$work/edge.docker"; fi
      cat "$work/problems"
    )
  }
  expect_clean 'caddy: sites/jainav.caddy passes the site checks' "$(site_case)"
  if [ "$have_jq" != 1 ]; then skip 'the site file check of the adapted JSON (jq is not installed)'; fi

  # A second app's site that imports tls_menumesh, whose client_auth is on from the start: the
  # server's tree once that site goes in, beside Jainav's without client_auth, both on :443. Its
  # files are throwaways: a CA for origin pulls, and an origin pair for the test zone.
  mm=$certs/menumesh
  mkdir -p "$mm"
  openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj '/CN=test origin pulls CA' \
    -keyout "$T/caddy/aop-ca-key.pem" -out "$mm/aop-ca.pem" 2>/dev/null
  openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj '/CN=example.net' \
    -keyout "$mm/origin-key.pem" -out "$mm/origin.pem" 2>/dev/null
  chmod 0644 "$mm/origin-key.pem"
  mm_site=$T/caddy/menumesh.caddy
  printf '%b\n' 'https://example.net {' '\timport site_common' '\timport tls_menumesh' \
    '\treverse_proxy menumesh-example:8080 {' '\t\timport upstream' '\t}' '}' >"$mm_site"
  # Its checks with the values another app's conf sets, as other_apps='menumesh ' fakes one above.
  second_site_case() { # second_site_case: what the menumesh site file's checks refuse
    (
      setup_lib
      # shellcheck disable=SC2034 # read by caddy_run in app-apply, sourced in setup_lib
      CADDY_IMAGE=$image
      # shellcheck disable=SC2034 # read by the site checks in app-apply, sourced in setup_lib
      ZONE=example.net UPSTREAMS=menumesh-example:8080 ENV_PREFIX=MENUMESH_
      edge_env_parse "$T/caddy/edge.env" "$work/edge"
      site_text_check menumesh "$mm_site" "$work/edge.keys"
      if [ "$have_jq" = 1 ]; then site_json_check menumesh "$mm_site" "$cfg/snippets.caddy" "$work/edge.docker"; fi
      cat "$work/problems"
    )
  }
  expect_clean 'caddy: a menumesh site with tls_menumesh passes the site checks' "$(second_site_case)"
  cp "$mm_site" "$cfg/sites/menumesh.caddy"
  expect_clean 'caddy: docker/edge/config validates with the menumesh site and its aop-ca.pem' "$(tree_case "$cfg")"
  rm "$mm/aop-ca.pem"
  expect_refused 'caddy: the menumesh site fails validate without its aop-ca.pem' "$(tree_case "$cfg")" 'caddy validate failed'
  rm -rf "$cfg/sites/menumesh.caddy" "$mm"
else
  :
fi

printf '%s checks, %s failed\n' "$checks" "$failed"
[ "$failed" -eq 0 ]
