#!/bin/bash
# Runs docker/host/app-deploy against stubs (tests/host/stubs) of docker, systemd-cat, flock,
# logger, app-compose, hostwatch, df, age and sleep, and checks what reaches them. The copy under
# test has its fixed paths moved into a temporary directory, so this needs no root, Docker or
# server. CI runs it on ubuntu-24.04; Git Bash runs it too (the migration cases need jq).
#   bash tests/host/app-deploy.sh
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
export STUB_STATE=$T/state
export STUB_SERVICE_VARS='app=APP_IMAGE app-staging=STAGING_IMAGE backup=BACKUP_IMAGE web=WEB_IMAGE
  web-staging=STAGING_IMAGE migrate=MIGRATE_IMAGE migrate-staging=MIGRATE_STAGING_IMAGE'

mkdir -p "$T/bin"
cp "$root"/tests/host/stubs/* "$T/bin/"
chmod +x "$T/bin"/*
sed -e "s|^PATH=/usr/sbin:|PATH=$T/bin:/usr/sbin:|" -e "s|/usr/local/sbin/|$T/bin/|g" \
  -e "s|/etc/apps/|$T/etc/apps/|g" -e "s|/srv/|$T/srv/|g" -e "s|/run/|$T/run/|g" \
  -e "s|/var/lib/|$T/var/lib/|g" "$root/docker/host/app-deploy" >"$T/app-deploy"
if ! grep -q "^PATH=$T/bin:" "$T/app-deploy"; then
  echo "app-deploy's PATH line moved: update this test"
  exit 1
fi

hex() { printf '%*s' "$2" '' | tr ' ' "$1"; }   # hex CHAR LENGTH
REPO=ghcr.io/nanu1605/jainav-infotech
EREPO=ghcr.io/example-org/example-app
sa=$(hex a 40) sb=$(hex b 40) s0=$(hex 0 40)
da=sha256:$(hex a 64) db=sha256:$(hex b 64) d0=sha256:$(hex 0 64)
ea=sha256:$(hex e 64) eb=sha256:$(hex f 64)
good="staging-$sa@$da tools-$sa@$ea"
nl=$'\n' cr=$'\r'
jenv=$T/srv/jainav/images.env
eenv=$T/srv/example/images.env

# A fresh server for each case: both apps' confs (the repo's, with paths moved and a test age
# recipient), approved compose files, images.env from the example, an empty stub state.
reset() {
  rm -rf "$T/etc" "$T/srv" "$T/run" "$T/var" "$STUB_STATE"
  mkdir -p "$T/etc/apps" "$T/srv/jainav" "$T/srv/example" "$T/run/lock" "$T/run/hostwatch" \
    "$T/var/lib/docker" "$T/var/lib/containerd" "$STUB_STATE"
  : >"$STUB_STATE/calls"
  {
    sed "s|/srv/|$T/srv/|g" "$root/docker/host/apps/jainav.conf"
    echo BACKUP_RECIPIENT=age1test
  } >"$T/etc/apps/jainav.conf"
  sed "s|/srv/|$T/srv/|g" "$root/docker/host/apps/app.conf.example" >"$T/etc/apps/example.conf"
  approve jainav compose.prod.yml
  approve example compose.yml
  cp "$root/docker/images.env.example" "$jenv"
  printf '%s=%s:none\n' WEB_IMAGE "$EREPO" STAGING_IMAGE "$EREPO" BACKUP_IMAGE "$EREPO" \
    MIGRATE_IMAGE "$EREPO" MIGRATE_STAGING_IMAGE "$EREPO" >"$eenv"
  : >"$T/srv/jainav/.env"
  : >"$T/srv/example/.env"
}
approve() {   # approve APP FILE: a compose file and the checksum app-apply writes for it
  printf 'name: %s\n' "$1" >"$T/srv/$1/$2"
  sha256sum "$T/srv/$1/$2" >"$T/etc/apps/$1.compose.sha256"
}
have_image() {   # have_image REPO TAG DIGEST: an image already on the server
  printf '%s %s %s\n%s - %s\n' "$1" "$2" "$3" "$1" "$3" >>"$STUB_STATE/images"
}
running() {   # running FILE VAR REF SERVICE: images.env names REF and the service runs it
  sed -i "s|^$2=.*|$2=$3|" "$1"
  printf '%s\n' "$3" >"$STUB_STATE/running-$4"
}

# deploy USER INPUT ARGS...: runs the copy from / as USER through sudo (root: without sudo),
# with INPUT on stdin. Sets out and status.
deploy() {
  local user=$1
  printf '%s' "$2" >"$T/stdin"
  shift 2
  set +e
  if [ "$user" = root ]; then
    out=$(cd / && env -u SUDO_USER bash "$T/app-deploy" "$@" <"$T/stdin" 2>&1)
  else
    out=$(cd / && SUDO_USER=$user bash "$T/app-deploy" "$@" <"$T/stdin" 2>&1)
  fi
  status=$?
  set -e
}

checks=0 failed=0 name=
start() { name=$1; before=$failed; reset; }
finish() { [ "$failed" -ne "$before" ] || printf 'ok - %s\n' "$name"; }
bad() {
  failed=$((failed + 1))
  printf 'not ok - %s: %s\n' "$name" "$1"
  sed 's/^/    | /' <<<"$out"
}
expect_status() { checks=$((checks + 1)); [ "$status" = "$1" ] || bad "exit $1, not $status"; }
expect_says() { checks=$((checks + 1)); [[ $out == *"$1"* ]] || bad "says: $1"; }
expect_call() { checks=$((checks + 1)); grep -qF -- "$1" "$STUB_STATE/calls" || bad "runs: $1"; }
expect_no_call() {
  checks=$((checks + 1))
  ! grep -qF -- "$1" "$STUB_STATE/calls" || bad "never runs: $1"
}
expect_calls() {   # expect_calls TEXT COUNT
  checks=$((checks + 1))
  [ "$(grep -cF -- "$1" "$STUB_STATE/calls")" = "$2" ] || bad "runs $2 times: $1"
}
expect_no_docker() {
  checks=$((checks + 1))
  ! grep -q '^docker ' "$STUB_STATE/calls" || bad "never runs docker"
}
expect_order() {   # expect_order FIRST SECOND: FIRST runs before SECOND
  local a b
  checks=$((checks + 1))
  a=$(grep -m 1 -nF -- "$1" "$STUB_STATE/calls" | cut -d: -f1) || a=''
  b=$(grep -m 1 -nF -- "$2" "$STUB_STATE/calls" | cut -d: -f1) || b=''
  if [ -z "$a" ] || [ -z "$b" ] || [ "$a" -ge "$b" ]; then bad "runs '$1' before '$2'"; fi
}
expect_line() {   # expect_line FILE LINE: FILE has exactly that line
  checks=$((checks + 1))
  grep -qFx -- "$2" "$1" || bad "$(basename "$1") has: $2"
}
expect_log() {   # expect_log ERE APP: the app's deploys.log has a line ending in ERE (dates vary)
  checks=$((checks + 1))
  grep -qE -- " $1\$" "$T/srv/$2/deploys.log" 2>/dev/null || bad "deploys.log has: $1"
}
expect_no_file() { checks=$((checks + 1)); [ ! -e "$1" ] || bad "no $1"; }
expect_alert() {
  checks=$((checks + 1))
  grep -qF -- "$1" "$STUB_STATE/alerts" 2>/dev/null || bad "alerts: $1"
}
expect_token() {
  checks=$((checks + 1))
  [ "$(cat "$STUB_STATE/login-token")" = "$1" ] || bad "docker login read $1"
}
expect_hidden() {   # expect_hidden SECRET: in no call, log or journal line
  checks=$((checks + 1))
  sleep 0.3   # the journal stub may still be writing
  ! cat "$STUB_STATE/calls" "$STUB_STATE/logger" "$STUB_STATE/journal" 2>/dev/null |
    grep -qF -- "$1" || bad "never logs $1"
}
expect_unchanged() {   # expect_unchanged FILE ORIGINAL VAR: FILE is ORIGINAL apart from VAR's line
  checks=$((checks + 1))
  diff <(grep -v "^$3=" "$1") <(grep -v "^$3=" "$2") >/dev/null || bad "only $3 changes"
}
expect_no_config() {
  checks=$((checks + 1))
  ! compgen -G "$T/run/app-deploy.*" >/dev/null || bad "its docker config is removed"
}

# Refusals: exit 2, the reason, and docker never runs.
refused() {   # refused DESCRIPTION USER INPUT REASON ARGS...
  local what=$1 user=$2 input=$3 reason=$4
  shift 4
  start "refuses $what"
  deploy "$user" "$input" "$@"
  expect_status 2
  expect_says "$reason"
  expect_no_docker
  finish
}
refused 'a bad verb' deploy-jainav "v1 destroy staging-$sa@$da -$nl" 'bad request' staging
refused 'another protocol version' deploy-jainav "v2 ping$nl" 'bad request' staging
refused 'extra words' deploy-jainav "v1 deploy $good extra$nl" 'bad request' staging
refused 'words after ping' deploy-jainav "v1 ping now$nl" 'bad request' staging
refused 'a missing digest' deploy-jainav "v1 deploy staging-$sa tools-$sa@$ea$nl" \
  "not allowed: staging-$sa" staging
refused 'a missing digest on the extra image' deploy-jainav \
  "v1 deploy staging-$sa@$da tools-$sa$nl" "not allowed: tools-$sa" staging
refused 'a short digest' deploy-jainav "v1 deploy staging-$sa@sha256:abc123 -$nl" \
  'not allowed' staging
refused "production's tag on staging" deploy-jainav "v1 deploy prod-v1.2.3@$da -$nl" \
  'not allowed: prod-v1.2.3' staging
refused 'a short commit' deploy-jainav "v1 deploy staging-abc123@$da -$nl" 'not allowed' staging
refused 'another repository' deploy-jainav "v1 deploy ghcr.io/evil/app:staging-$sa@$da -$nl" \
  'bad characters' staging
refused "another app's image" deploy-jainav "v1 deploy staging-$sa@$da migrate-$sa@$ea$nl" \
  "not allowed: migrate-$sa" staging
refused "Jainav's tools image from another app's key" deploy-example \
  "v1 deploy staging-$sa@$da tools-$sa@$ea$nl" "not allowed: tools-$sa" staging
# The quotes keep the metacharacters literal: they are what app-deploy must refuse.
# shellcheck disable=SC2016
for ref in "staging-$sa@$da;reboot" '$(id)' '`id`' "staging-$sa@$da|id" "staging-$sa@$da&" '*' \
  '../../x' "STAGING-$sa@$da" "staging-$sa@$da>x"; do
  refused "shell metacharacters ($ref)" deploy-jainav "v1 deploy $ref -$nl" 'bad characters' staging
done
refused 'an environment its keys may not deploy' deploy-example "v1 ping$nl" \
  'production is admin-only' production
refused 'the admin-only backup environment from CI' deploy-jainav "v1 ping$nl" \
  'backup is admin-only' backup
refused 'an unknown app' deploy-nope "v1 ping$nl" 'unknown app' staging
refused 'a bad app name' deploy-Jainav "v1 ping$nl" 'bad app name' staging
refused 'an empty app name' deploy- "v1 ping$nl" 'bad app name' staging
refused "a path for the admin's app" ops '' 'bad app name' ../jainav staging "staging-$sa"
refused 'an unknown environment' ops '' 'unknown environment: qa' jainav qa "staging-$sa"
refused 'a carriage return after ping' deploy-jainav "v1 ping$cr$nl" 'bad request' staging
refused 'a carriage return after a request' deploy-jainav "v1 deploy $good$cr$nl" \
  'bad characters' staging
refused 'an over-long line' deploy-jainav "v1 deploy staging-$sa@$da $(hex a 600)$nl" \
  'request too long' staging
refused 'an empty request' deploy-jainav '' 'no request' staging
refused 'two arguments from CI' deploy-jainav "v1 ping$nl" 'usage' staging production
refused 'the admin form with one argument' ops '' 'usage' jainav
refused 'another sudo user' mallory '' 'usage' jainav staging "staging-$sa"

start "refuses a deploy user that isn't the conf's CI_USER"
{ sed "s|/srv/|$T/srv/|g" "$root/docker/host/apps/jainav.conf"; echo CI_USER=deploy-someone; } \
  >"$T/etc/apps/other.conf"
deploy deploy-other "v1 ping$nl" staging
expect_status 2
expect_says 'deploy-other may not deploy other'
finish

start 'answers a ping'
deploy deploy-jainav "v1 ping$nl" staging
expect_status 0
expect_says 'pong jainav staging'
expect_no_docker
expect_no_call flock
finish

start 'deploys a good staging request'
deploy deploy-jainav "v1 deploy $good${nl}test-token-123$nl" staging
expect_status 0
expect_says "app-staging is running staging-$sa"
expect_call 'flock -w 30 9'
expect_call 'docker login ghcr.io -u nanu1605 --password-stdin'
expect_token test-token-123
expect_call "docker pull -q $REPO@$da"
expect_call "docker tag $REPO@$da $REPO:staging-$sa"
expect_call "docker pull -q $REPO@$ea"
expect_call "docker tag $REPO@$ea $REPO:tools-$sa"
expect_call 'docker logout ghcr.io'
expect_call "docker compose --project-directory $T/srv/jainav -f $T/srv/jainav/compose.prod.yml\
 --env-file $T/srv/jainav/.env --env-file $jenv up -d --no-deps app-staging"
expect_order "docker pull -q $REPO@$da" 'up -d --no-deps app-staging'
expect_line "$jenv" "STAGING_IMAGE=$REPO:staging-$sa@$da"
expect_unchanged "$jenv" "$root/docker/images.env.example" STAGING_IMAGE
expect_log "staging app-staging none -> staging-$sa@$da by deploy-jainav" jainav
expect_no_config
expect_hidden test-token-123
expect_no_call hostwatch
finish

start 'keeps a token sent without a final newline'
deploy deploy-jainav "v1 deploy $good${nl}tok" staging
expect_status 0
expect_token tok
finish

start 'prunes older images after a deploy'
have_image "$REPO" "staging-$s0" "$d0"
have_image "$REPO" "staging-$sa" "$da"
for n in 1 2 3 4; do have_image "$REPO" "tools-$(hex "$n" 40)" "sha256:$(hex "$n" 64)"; done
running "$jenv" STAGING_IMAGE "$REPO:staging-$sa@$da" app-staging
deploy deploy-jainav "v1 deploy staging-$sb@$db tools-$sb@$eb${nl}t$nl" staging
expect_status 0
expect_call "docker rmi $REPO:staging-$s0"
expect_call "docker rmi $REPO@$d0"
expect_no_call "docker rmi $REPO:staging-$sa"
expect_no_call "docker rmi $REPO:staging-$sb"
expect_no_call "docker rmi $REPO:tools-$sb"
expect_no_call "docker rmi $REPO:tools-$(hex 4 40)"
expect_no_call "docker rmi $REPO:tools-$(hex 3 40)"
expect_call "docker rmi $REPO:tools-$(hex 2 40)"
expect_call "docker rmi $REPO:tools-$(hex 1 40)"
expect_log "staging app-staging staging-$sa@$da -> staging-$sb@$db by deploy-jainav" jainav
finish

start 'rolls back when the health check fails'
have_image "$REPO" "staging-$sa" "$da"
running "$jenv" STAGING_IMAGE "$REPO:staging-$sa@$da" app-staging
echo "staging-$sb" >"$STUB_STATE/bad"
deploy deploy-jainav "v1 deploy staging-$sb@$db -$nl" staging
expect_status 1
expect_says 'app-staging is unhealthy'
expect_says 'journalctl COM_DOCKER_COMPOSE_PROJECT=jainav COM_DOCKER_COMPOSE_SERVICE=app-staging'
expect_says "rolling back to staging-$sa@$da"
expect_says "app-staging is back on staging-$sa@$da"
expect_line "$jenv" "STAGING_IMAGE=$REPO:staging-$sa@$da"
expect_calls 'up -d --no-deps app-staging' 2
expect_line "$STUB_STATE/running-app-staging" "$REPO:staging-$sa@$da"
expect_no_file "$T/srv/jainav/deploys.log"
expect_no_call hostwatch
expect_no_call 'docker rmi'
finish

start 'fails at once on a restarting container'
have_image "$REPO" "staging-$sa" "$da"
running "$jenv" STAGING_IMAGE "$REPO:staging-$sa@$da" app-staging
echo "staging-$sb" >"$STUB_STATE/crash"
deploy deploy-jainav "v1 deploy staging-$sb@$db -$nl" staging
expect_status 1
expect_says 'app-staging keeps restarting'
expect_no_call sleep
expect_says "app-staging is back on staging-$sa@$da"
finish

start 'rolls back after HEALTH_TIMEOUT'
echo HEALTH_TIMEOUT=9 >>"$T/etc/apps/jainav.conf"
have_image "$REPO" "staging-$sa" "$da"
running "$jenv" STAGING_IMAGE "$REPO:staging-$sa@$da" app-staging
echo "staging-$sb" >"$STUB_STATE/starting"
deploy deploy-jainav "v1 deploy staging-$sb@$db -$nl" staging
expect_status 1
expect_says 'app-staging is not healthy after 9 s'
expect_calls 'sleep 3' 3
expect_says "app-staging is back on staging-$sa@$da"
finish

start 'alerts when the rollback is unhealthy too'
have_image "$REPO" "staging-$sa" "$da"
running "$jenv" STAGING_IMAGE "$REPO:staging-$sa@$da" app-staging
printf '%s\n' "staging-$sb" "staging-$sa" >"$STUB_STATE/bad"
deploy deploy-jainav "v1 deploy staging-$sb@$db -$nl" staging
expect_status 1
expect_says 'the rollback is unhealthy too'
expect_alert "app-deploy: jainav staging: app-staging failed on staging-$sb,"
finish

start 'stops a failed first deploy and alerts'
echo prod-v1.0.0 >"$STUB_STATE/bad"
deploy deploy-jainav "v1 deploy prod-v1.0.0@$da tools-$sa@$ea${nl}t$nl" production
expect_status 1
expect_call "--env-file $jenv stop app"
expect_line "$jenv" "APP_IMAGE=$REPO:none"
expect_alert 'app failed on prod-v1.0.0 and is stopped'
expect_says 'there is no earlier image'
finish

start 'dumps the database before a production switch'
mkdir -p "$T/srv/jainav/predeploy"
for stamp in 20260101T000000Z 20260102T000000Z 20260103T000000Z; do
  echo old >"$T/srv/jainav/predeploy/production-$stamp-jainav.dump.age"
done
have_image "$REPO" prod-v1.2.2 "$d0"
running "$jenv" APP_IMAGE "$REPO:prod-v1.2.2@$d0" app
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 0
expect_call 'exec -T postgres pg_dump -Fc -U postgres jainav'
expect_call 'age -r age1test'
expect_order 'pg_dump' 'up -d --no-deps app'
dumps=("$T"/srv/jainav/predeploy/production-*-jainav.dump.age)
checks=$((checks + 1))
[ "${#dumps[@]}" -eq 3 ] || bad "keeps 3 dumps, not ${#dumps[@]}"
expect_no_file "$T/srv/jainav/predeploy/production-20260101T000000Z-jainav.dump.age"
expect_says 'app is running prod-v1.2.3'
expect_log "production app prod-v1.2.2@$d0 -> prod-v1.2.3@$da by deploy-jainav" jainav
finish

start 'refuses production without BACKUP_RECIPIENT'
sed -i '/^BACKUP_RECIPIENT=age1test$/d' "$T/etc/apps/jainav.conf"
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 2
expect_says 'BACKUP_RECIPIENT is empty'
expect_no_docker
finish

start 'switches nothing when the dump fails'
have_image "$REPO" prod-v1.2.2 "$d0"
running "$jenv" APP_IMAGE "$REPO:prod-v1.2.2@$d0" app
touch "$STUB_STATE/dump-fails"
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 1
expect_says 'the dump of jainav failed; nothing switched'
expect_no_call 'up -d'
expect_line "$jenv" "APP_IMAGE=$REPO:prod-v1.2.2@$d0"
finish

start 'gives up after 300 s behind another deploy of the app'
touch "$STUB_STATE/lock-busy"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'waiting for another deploy of jainav (30 s)'
expect_says 'another deploy of jainav is still running after 300 s'
expect_calls 'flock -w 30 9' 10
expect_no_docker
finish

start "refuses a compose file app-apply didn't approve"
echo 'services: {}' >>"$T/srv/jainav/compose.prod.yml"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'compose.prod.yml is not the file app-apply approved'
expect_no_docker
finish

start 'refuses when no compose file was approved'
rm "$T/etc/apps/jainav.compose.sha256"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'is not the file app-apply approved'
expect_no_docker
finish

start 'refuses staging while the server is throttled'
touch "$T/run/hostwatch/throttled"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'CPU-throttled'
expect_no_docker
finish

start 'deploys production while throttled, with a warning'
touch "$T/run/hostwatch/throttled"
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 0
expect_says 'warning: the server is CPU-throttled'
finish

start 'refuses with under 5 GB free'
echo 1000 >"$STUB_STATE/df-kb"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'under 5 GB free'
expect_no_docker
finish

start 'refuses an images.env without the variable'
sed -i '/^STAGING_IMAGE=/d' "$jenv"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'images.env has no STAGING_IMAGE line'
expect_no_docker
finish

start 'switches nothing when the pull fails'
touch "$STUB_STATE/pull-fails"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 1
expect_says "couldn't pull staging-$sa@$da"
expect_no_call 'up -d'
expect_line "$jenv" "STAGING_IMAGE=$REPO:none"
expect_no_config
finish

start "deploys a local tag for the admin and records its digest"
have_image "$REPO" prod-v1.2.3 "$db"
deploy ops '' jainav production prod-v1.2.3
expect_status 0
expect_no_call 'docker pull'
expect_no_call 'docker login'
expect_line "$jenv" "APP_IMAGE=$REPO:prod-v1.2.3@$db"
expect_log "production app none -> prod-v1.2.3@$db by ops" jainav
finish

start "pulls with the admin's token from stdin"
deploy ops "pat-123$nl" jainav production prod-v1.2.4
dz=sha256:$(printf '%s' "$REPO:prod-v1.2.4" | sha256sum | cut -c 1-64)
expect_status 0
expect_token pat-123
expect_call "docker pull -q $REPO:prod-v1.2.4"
expect_line "$jenv" "APP_IMAGE=$REPO:prod-v1.2.4@$dz"
expect_hidden pat-123
finish

start 'tells the admin that a pull needs a token'
touch "$STUB_STATE/pull-fails"
deploy ops '' jainav production prod-v1.2.4
expect_status 1
expect_says 'needs a read:packages token on stdin'
finish

start 'deploys the backup image as root; no healthcheck means 15 s of running'
echo backup >"$STUB_STATE/nohealth"
deploy root '' jainav backup "backup-$sa@$da"
expect_status 0
expect_says "backup is running backup-$sa"
expect_calls 'sleep 3' 5
expect_log "backup backup none -> backup-$sa@$da by root" jainav
finish

if command -v jq >/dev/null; then
  migrate_config='{"services":{"migrate-staging":{"mem_limit":"536870912"}}}'

  start 'runs migrations before the switch'
  printf '%s\n' "$migrate_config" >"$STUB_STATE/config.json"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 0
  expect_call 'app-compose headroom 512'
  expect_call "ran migrate-staging $EREPO:migrate-$sa@$ea"
  expect_order 'ran migrate-staging' 'up -d --no-deps web-staging'
  expect_line "$eenv" "MIGRATE_STAGING_IMAGE=$EREPO:migrate-$sa@$ea"
  expect_line "$eenv" "STAGING_IMAGE=$EREPO:staging-$sa@$da"
  expect_says "web-staging is running staging-$sa"
  finish

  start 'switches nothing when migrations fail'
  printf '%s\n' "$migrate_config" >"$STUB_STATE/config.json"
  touch "$STUB_STATE/run-fails"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 1
  expect_says 'migrate-staging failed; nothing switched'
  expect_no_call 'up -d'
  expect_line "$eenv" "MIGRATE_STAGING_IMAGE=$EREPO:none"
  expect_line "$eenv" "STAGING_IMAGE=$EREPO:none"
  finish

  start 'switches nothing without memory headroom for migrations'
  printf '%s\n' "$migrate_config" >"$STUB_STATE/config.json"
  touch "$STUB_STATE/no-headroom"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 1
  expect_says 'not enough memory'
  expect_no_call 'ran migrate-staging'
  expect_no_call 'up -d'
  finish
else
  echo 'skip - the migration cases (jq is not installed)'
fi

printf '%s checks, %s failed\n' "$checks" "$failed"
[ "$failed" -eq 0 ]
