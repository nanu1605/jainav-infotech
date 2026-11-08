#!/bin/bash
# Runs the checks of docker/host/app-apply on the repo's own files, so a change to a compose file or
# to the edge config that the server would refuse fails here and not at the first install. It
# sources app-apply's functions (APP_APPLY_SOURCE_ONLY=1), so the rules under test are the ones
# root runs, and needs neither root nor a server:
#   - the text checks on docker/compose.prod.yml and docker/edge/compose.yml, and on small files
#   - Compose's JSON of both files with dummy env files, through every jq rule that needs no root
#     (needs docker compose and jq), and the rules on hand-written JSON (needs jq)
#   - edge.env and log-redact files
#   - docker/edge/config and the Jainav site file through the pinned Caddy: validate, the site
#     file's checks, and a log-redact file (needs docker, the pinned image and openssl)
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
expect_refused 'text: an interpolated project name' "$(text_case jainav "$(yml namevar 'name: ${MM_NAME:-jainav}' 'services: {}')")" 'project name must be jainav'
expect_refused 'text: a top-level key' "$(text_case jainav "$(yml top "$head" 'configs:' '  c: {}')")" 'top-level keys'

# --- env files and log-redact files ---

env_case() { # env_case <content>: what edge_env_parse refuses
  (
    setup_lib
    printf '%s\n' "$1" >"$work/e.env"
    edge_env_parse "$work/e.env" "$work/edge"
    cat "$work/problems"
  )
}
expect_clean 'edge.env: an app variable' "$(env_case 'JAINAV_DOMAIN=example.test')"
expect_clean 'edge.env: a quoted hash' "$(env_case "JAINAV_STAGING_AUTH_HASH='\$2a\$14\$abcdef'")"
expect_refused 'edge.env: CADDY_ADMIN' "$(env_case 'CADDY_ADMIN=0.0.0.0:2019')" 'starts with no app'
expect_refused 'edge.env: HTTP_PROXY' "$(env_case 'HTTP_PROXY=http://jainav-app:3000')" 'starts with no app'
expect_refused 'edge.env: COMPOSE_PROJECT_NAME' "$(env_case 'COMPOSE_PROJECT_NAME=jainav')" 'starts with no app'
expect_refused 'edge.env: a value with a space' "$(env_case 'JAINAV_DOMAIN=a b')" 'plain'

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
    project=jainav
    UPSTREAMS= allowed_edge= other_apps= extra_keys= CADDY_IMAGE=
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
  expect_refused 'interpolation: privileged from the env files' \
    "$(interp_case "$(json int1 '{"name":"jainav","services":{"app":{"image":"${APP_IMAGE:?x}","privileged":"${MM_PRIV:-false}"}}}')")" 'privileged takes a value'
  expect_refused 'interpolation: a bind source from the env files' \
    "$(interp_case "$(json int2 '{"name":"jainav","services":{"app":{"image":"x","volumes":["${MM_CFG:-./config}:/cfg:ro"]}}}')")" 'volumes takes a value'
  expect_refused 'interpolation: a network name from the env files' \
    "$(interp_case "$(json int3 '{"name":"jainav","services":{},"networks":{"n":{"name":"${MM_NET}"}}}')")" 'n takes a value'
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
  hash=$(docker run --rm "$image" caddy hash-password --plaintext 'test-only')
  {
    echo 'JAINAV_DOMAIN=example.test'
    echo 'JAINAV_STAGING_AUTH_USER=jainav'
    printf "JAINAV_STAGING_AUTH_HASH='%s'\n" "$hash"
  } >"$T/caddy/edge.env"

  # edge.env as app-apply parses it, then the whole tree through its own tree_validate.
  tree_case() { # tree_case <config dir>: what tree_validate refuses
    (
      setup_lib
      CADDY_IMAGE=$image
      edge_env_parse "$T/caddy/edge.env" "$work/edge"
      tree_validate "$1" "$certs" "$work/edge.docker"
      cat "$work/problems"
    )
  }
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
      CADDY_IMAGE=$image
      # shellcheck source=/dev/null
      . "$root/docker/host/apps/jainav.conf"
      ZONE=example.test
      edge_env_parse "$T/caddy/edge.env" "$work/edge"
      site_text_check jainav "$cfg/sites/jainav.caddy" "$work/edge.keys"
      if [ "$have_jq" = 1 ]; then site_json_check jainav "$cfg/sites/jainav.caddy" "$cfg/snippets.caddy" "$work/edge.docker"; fi
      cat "$work/problems"
    )
  }
  expect_clean 'caddy: sites/jainav.caddy passes the site checks' "$(site_case)"
  if [ "$have_jq" != 1 ]; then skip 'the site file check of the adapted JSON (jq is not installed)'; fi
else
  :
fi

printf '%s checks, %s failed\n' "$checks" "$failed"
[ "$failed" -eq 0 ]
