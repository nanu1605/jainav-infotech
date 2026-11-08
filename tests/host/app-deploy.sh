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
  rm -rf "${T:?}/etc" "${T:?}/srv" "${T:?}/run" "${T:?}/var" "$STUB_STATE"
  mkdir -p "$T/etc/apps" "$T/srv/jainav" "$T/srv/example" "$T/run/app-locks" "$T/run/hostwatch" \
    "$T/var/lib/docker" "$T/var/lib/containerd" "$STUB_STATE"
  chmod 0700 "$T/run/app-locks"
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
have_image() {   # have_image REPO TAG DIGEST: an image already on the server, labelled with its tag
  printf '%s %s %s\n%s - %s\n' "$1" "$2" "$3" "$1" "$3" >>"$STUB_STATE/images"
  printf '%s %s\n' "$3" "$2" >>"$STUB_STATE/labels"
}
label_as() { printf '%s %s\n' "$1" "$2" >>"$STUB_STATE/labels-override"; }   # label_as DIGEST TAG
running() {   # running FILE VAR REF SERVICE: images.env names REF and the service runs it
  sed -i "s|^$2=.*|$2=$3|" "$1"
  printf '%s\n' "$3" >"$STUB_STATE/running-$4"
}

# deploy USER INPUT ARGS...: runs the copy from / as USER through sudo (root: without sudo),
# with INPUT on stdin. Sets out and status. Every tag@digest in the request is labelled with its
# tag, as CI builds it (label_as overrides that). The script's pid is in $STUB_STATE/pid.
deploy() {
  local user=$1 r
  printf '%s' "$2" >"$T/stdin"
  shift 2
  case $user in
    deploy-*) read -ra words <"$T/stdin" || true; refs=("${words[@]:2:2}") ;;
    *) refs=("${3-}" "${4-}") ;;
  esac
  for r in "${refs[@]}"; do
    case $r in *@*) printf '%s %s\n' "${r#*@}" "${r%%@*}" >>"$STUB_STATE/labels" ;; esac
  done
  set +e
  if [ "$user" = root ]; then
    # shellcheck disable=SC2016 # the inner bash expands $$ and $STUB_STATE, not this shell
    out=$(cd / && env -u SUDO_USER bash -c 'echo $$ >"$STUB_STATE/pid"; exec bash "$@"' _ \
      "$T/app-deploy" "$@" <"$T/stdin" 2>&1)
  else
    out=$(cd / && SUDO_USER=$user bash -c 'echo $$ >"$STUB_STATE/pid"; exec bash "$@"' _ \
      "$T/app-deploy" "$@" <"$T/stdin" 2>&1)
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
  printf '%s\n' "$out" | sed 's/^/    | /'
}
expect_status() { checks=$((checks + 1)); [ "$status" = "$1" ] || bad "exit $1, not $status"; }
expect_says() { checks=$((checks + 1)); [[ $out == *"$1"* ]] || bad "says: $1"; }
expect_not_says() { checks=$((checks + 1)); [[ $out != *"$1"* ]] || bad "never says: $1"; }
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
expect_unchanged() {   # expect_unchanged FILE ORIGINAL VAR...: FILE is ORIGINAL apart from VAR's lines
  local file=$1 original=$2 v re=
  checks=$((checks + 1))
  shift 2
  for v in "$@"; do re+="${re:+|}^$v="; done
  diff <(grep -Ev "$re" "$file") <(grep -Ev "$re" "$original") >/dev/null || bad "only $* change"
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
refused 'a tag with a prefix' deploy-jainav "v1 deploy xstaging-$sa@$da -$nl" 'not allowed' staging
refused 'a tag with a suffix' deploy-jainav "v1 deploy staging-${sa}0@$da -$nl" 'not allowed' staging
refused 'a digest with a suffix' deploy-jainav "v1 deploy staging-$sa@${da}0 -$nl" 'not allowed' staging
refused 'a tools tag with a prefix' deploy-jainav "v1 deploy staging-$sa@$da xtools-$sa@$ea$nl" \
  'not allowed' staging
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

start 'refuses a conf that others can write'
chmod 0666 "$T/etc/apps/jainav.conf"
deploy deploy-jainav "v1 ping$nl" staging
if [ "$(stat -c %a "$T/etc/apps/jainav.conf")" = 666 ]; then   # a file system without modes can't
  expect_status 2
  expect_says 'must belong to root and be writable by no one else'
  expect_no_docker
fi
finish

start 'refuses a tag pattern written with anchors'
sed -i "s|TAG='staging-|TAG='^staging-|" "$T/etc/apps/jainav.conf"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'without ^ and $'
expect_no_docker
finish

start 'refuses a lock directory that others can write'
chmod 0777 "$T/run/app-locks"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
if [ "$(stat -c %a "$T/run/app-locks")" = 777 ]; then
  expect_status 2
  expect_says '/run/app-locks must belong to root'
  expect_no_docker
fi
finish

start 'refuses an env file that sets a COMPOSE_ variable'
echo 'COMPOSE_PROJECT_NAME=other' >>"$T/srv/jainav/.env"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says '.env sets a COMPOSE_ variable'
expect_no_docker
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
expect_call "docker compose -p jainav --project-directory $T/srv/jainav\
 -f $T/srv/jainav/compose.prod.yml --env-file $T/srv/jainav/.env --env-file $jenv\
 up -d --no-deps app-staging"
expect_order "docker pull -q $REPO@$da" 'up -d --no-deps app-staging'
# The label is read before the tag is made, so a mislabelled digest never gets one.
expect_order "docker image inspect --format {{index .Config.Labels" "docker tag $REPO@$da"
expect_call 'label=com.docker.compose.oneoff=False'
expect_line "$jenv" "STAGING_IMAGE=$REPO:staging-$sa@$da"
expect_line "$jenv" "TOOLS_STAGING_IMAGE=$REPO:tools-$sa@$ea"
expect_line "$jenv" "TOOLS_IMAGE=$REPO:none"
expect_unchanged "$jenv" "$root/docker/images.env.example" STAGING_IMAGE TOOLS_STAGING_IMAGE
expect_log "staging app-staging none -> staging-$sa@$da by deploy-jainav" jainav
expect_no_config
expect_hidden test-token-123
expect_no_call hostwatch
# What docker and compose print goes to the journal, never to the caller's SSH channel.
expect_not_says 'Login Succeeded'
expect_not_says "$REPO@"
expect_not_says 'docker compose'
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
# Production's last deploy named tools-1: staging deploys never prune it.
sed -i "s|^TOOLS_IMAGE=.*|TOOLS_IMAGE=$REPO:tools-$(hex 1 40)@sha256:$(hex 1 64)|" "$jenv"
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
expect_no_call "docker rmi $REPO:tools-$(hex 1 40)"
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
expect_log "staging app-staging staging-$sa@$da -> staging-$sb@$db ROLLED BACK to staging-$sa@$da by deploy-jainav" jainav
expect_line "$jenv" "TOOLS_STAGING_IMAGE=$REPO:none"
expect_no_call hostwatch
expect_no_call 'docker rmi'
finish

start 'alerts on every production rollback and keeps the last dumps'
mkdir -p "$T/srv/jainav/predeploy"
for stamp in 20260101T000000Z 20260102T000000Z 20260103T000000Z; do
  echo old >"$T/srv/jainav/predeploy/production-$stamp-jainav.dump.age"
done
have_image "$REPO" prod-v1.2.2 "$d0"
running "$jenv" APP_IMAGE "$REPO:prod-v1.2.2@$d0" app
echo prod-v1.2.3 >"$STUB_STATE/bad"
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 1
expect_says "app is back on prod-v1.2.2@$d0"
expect_alert "app-deploy: jainav production: app failed on prod-v1.2.3; rolled back to prod-v1.2.2@$d0; pre-deploy dump in $T/srv/jainav/predeploy"
expect_log "production app prod-v1.2.2@$d0 -> prod-v1.2.3@$da ROLLED BACK to prod-v1.2.2@$d0 by deploy-jainav" jainav
# A failed attempt dumped the database again, and the dump from before the change is still there.
dumps=("$T"/srv/jainav/predeploy/production-*-jainav.dump.age)
checks=$((checks + 1))
[ "${#dumps[@]}" -eq 4 ] || bad "keeps all 4 dumps, not ${#dumps[@]}"
expect_line "$jenv" "TOOLS_IMAGE=$REPO:none"
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
expect_says 'the rollback failed too'
expect_alert "app-deploy: jainav staging: app-staging failed on staging-$sb,"
expect_log "staging app-staging staging-$sa@$da -> staging-$sb@$db FAILED, and the rollback to staging-$sa@$da failed too by deploy-jainav" jainav
finish

start 'says what failed when compose up fails, and alerts when the rollback fails too'
have_image "$REPO" "staging-$sa" "$da"
running "$jenv" STAGING_IMAGE "$REPO:staging-$sa@$da" app-staging
touch "$STUB_STATE/up-fails"
deploy deploy-jainav "v1 deploy staging-$sb@$db -$nl" staging
expect_status 1
expect_says 'docker compose up failed for app-staging'
expect_not_says 'unhealthy'
expect_alert 'and the rollback to'
expect_line "$jenv" "STAGING_IMAGE=$REPO:staging-$sa@$da"
finish

start 'stops a failed first deploy and alerts'
echo prod-v1.0.0 >"$STUB_STATE/bad"
deploy deploy-jainav "v1 deploy prod-v1.0.0@$da tools-$sa@$ea${nl}t$nl" production
expect_status 1
expect_call "--env-file $jenv stop app"
expect_line "$jenv" "APP_IMAGE=$REPO:none"
expect_alert 'app failed on prod-v1.0.0 and is stopped'
expect_says 'there is no earlier image'
expect_log "production app none -> prod-v1.0.0@$da FAILED, stopped: there was no earlier image by deploy-jainav" jainav
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

start 'refuses a dump that is too small'
have_image "$REPO" prod-v1.2.2 "$d0"
running "$jenv" APP_IMAGE "$REPO:prod-v1.2.2@$d0" app
touch "$STUB_STATE/dump-small"
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 1
expect_says 'the dump of jainav is too small; nothing switched'
expect_no_call 'up -d'
expect_log "production app prod-v1.2.2@$d0 -> prod-v1.2.3@$da FAILED: the dump of jainav is too small; nothing switched by deploy-jainav" jainav
finish

start 'waits 600 s behind another deploy of the app when CI asks'
touch "$STUB_STATE/lock-busy"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'waiting for another deploy of jainav (30 s)'
expect_says 'another deploy of jainav is still running after 600 s; re-run this job when it ends'
expect_calls 'flock -w 30 9' 20
expect_no_docker
finish

start 'waits 300 s behind another deploy of the app when the admin asks'
touch "$STUB_STATE/lock-busy"
deploy ops '' jainav staging "staging-$sa@$da"
expect_status 2
expect_says 'another deploy of jainav is still running after 300 s; run this again when it ends'
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

start 'logs a failed pull in deploys.log'
touch "$STUB_STATE/pull-fails"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 1
expect_log "staging app-staging none -> staging-$sa@$da FAILED: couldn't pull staging-$sa@$da by deploy-jainav" jainav
finish

start 'switches nothing when only the extra image fails to pull'
echo "$ea" >"$STUB_STATE/pull-fails-on"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 1
expect_says "couldn't pull tools-$sa@$ea"
expect_no_call 'up -d'
expect_line "$jenv" "STAGING_IMAGE=$REPO:none"
expect_line "$jenv" "TOOLS_STAGING_IMAGE=$REPO:none"
finish

start 'switches nothing when the registry refuses the token'
touch "$STUB_STATE/login-fails"
deploy deploy-jainav "v1 deploy $good${nl}bad-token$nl" staging
expect_status 1
expect_says 'ghcr.io refused the token'
expect_no_call 'docker pull'
expect_no_call 'up -d'
expect_no_config
expect_hidden bad-token
finish

start 'refuses a digest labelled for another tag (production running a staging build)'
label_as "$da" "staging-$sa"
deploy deploy-jainav "v1 deploy prod-v1.2.3@$da tools-$sa@$ea${nl}t$nl" production
expect_status 1
expect_says "doesn't carry its tag as its label; nothing switched"
expect_no_call "docker tag $REPO@$da"
expect_no_call 'pg_dump'
expect_no_call 'up -d'
expect_line "$jenv" "APP_IMAGE=$REPO:none"
expect_log "production app none -> prod-v1.2.3@$da FAILED: prod-v1.2.3@$da doesn't carry its tag as its label; nothing switched by deploy-jainav" jainav
finish

start 'refuses an extra digest that is not labelled for its tag'
label_as "$ea" "tools-$sb"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 1
expect_says "doesn't carry its tag as its label"
expect_no_call "docker tag $REPO@$ea"
expect_no_call 'up -d'
finish

start 'refuses an image with no label'
label_as "$da" -
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 1
expect_says "doesn't carry its tag as its label"
expect_no_call "docker tag $REPO@$da"
finish

start 'refuses an extra image for an environment that records none'
deploy root '' jainav backup "backup-$sa@$da" "tools-$sa@$ea"
expect_status 2
expect_says 'no extra image for backup'
expect_no_docker
finish

start 'refuses an extra image for an app without one'
echo "EXTRA_TAG=" >>"$T/etc/apps/jainav.conf"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'no extra image for jainav'
expect_no_docker
finish

start 'refuses an images.env without the extra variable'
sed -i '/^TOOLS_STAGING_IMAGE=/d' "$jenv"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'images.env has no TOOLS_STAGING_IMAGE line'
expect_no_docker
finish

start 'refuses ENV_FILES without images.env'
echo 'ENV_FILES=".env"' >>"$T/etc/apps/jainav.conf"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'lacks images.env'
expect_no_docker
finish

start 'refuses a project without images.env'
rm "$jenv"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 2
expect_says 'no images.env in'
expect_no_docker
finish

start 'stops before the switch on Ctrl-C during a pull'
touch "$STUB_STATE/interrupt-on-pull"
deploy deploy-jainav "v1 deploy $good${nl}t$nl" staging
expect_status 1
expect_says 'interrupted; nothing switched'
expect_no_call 'up -d'
expect_line "$jenv" "STAGING_IMAGE=$REPO:none"
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

  start 'tells the caller that migrations stay applied when the switch is rolled back'
  printf '%s\n' "$migrate_config" >"$STUB_STATE/config.json"
  have_image "$EREPO" "staging-$sb" "$db"
  running "$eenv" STAGING_IMAGE "$EREPO:staging-$sb@$db" web-staging
  sed -i "s|^MIGRATE_STAGING_IMAGE=.*|MIGRATE_STAGING_IMAGE=$EREPO:migrate-$sb@$eb|" "$eenv"
  echo "staging-$sa" >"$STUB_STATE/bad"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 1
  expect_says "web-staging is back on staging-$sb@$db"
  expect_says "migrations from migrate-$sa stay applied; web-staging runs staging-$sb@$db"
  expect_line "$eenv" "MIGRATE_STAGING_IMAGE=$EREPO:migrate-$sa@$ea"
  expect_log "staging web-staging staging-$sb@$db -> staging-$sa@$da ROLLED BACK to staging-$sb@$db; migrations from migrate-$sa stay applied; web-staging runs staging-$sb@$db by deploy-example" example
  expect_no_call hostwatch
  finish

  start 'alerts that migrations stay applied when production is rolled back'
  printf '%s\n' '{"services":{"migrate":{"mem_limit":"536870912"}}}' >"$STUB_STATE/config.json"
  echo BACKUP_RECIPIENT=age1test >>"$T/etc/apps/example.conf"
  have_image "$EREPO" prod-v1.2.2 "$d0"
  running "$eenv" WEB_IMAGE "$EREPO:prod-v1.2.2@$d0" web
  echo prod-v1.2.3 >"$STUB_STATE/bad"
  deploy ops '' example production "prod-v1.2.3@$da" "migrate-$sa@$ea"
  expect_status 1
  expect_alert "example production: web failed on prod-v1.2.3; rolled back to prod-v1.2.2@$d0; pre-deploy dump in $T/srv/example/predeploy; migrations from migrate-$sa stay applied"
  finish

  start 'switches nothing without a mem_limit for the migrate service'
  printf '%s\n' '{"services":{}}' >"$STUB_STATE/config.json"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 1
  expect_says 'no mem_limit for migrate-staging; nothing switched'
  expect_no_call 'ran migrate-staging'
  finish

  start 'refuses an images.env without the migrate variable'
  sed -i '/^MIGRATE_STAGING_IMAGE=/d' "$eenv"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 2
  expect_says 'images.env has no MIGRATE_STAGING_IMAGE line'
  expect_no_docker
  finish

  start 'refuses a migrate image for an environment without a migrate service'
  sed -i '/MIGRATE_SERVICE=migrate-staging/d' "$T/etc/apps/example.conf"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 2
  expect_says 'no migrate service for staging'
  expect_no_docker
  finish

  start 'refuses a migrate image that is not labelled for its tag'
  printf '%s\n' "$migrate_config" >"$STUB_STATE/config.json"
  label_as "$ea" "migrate-$sb"
  deploy deploy-example "v1 deploy staging-$sa@$da migrate-$sa@$ea${nl}t$nl" staging
  expect_status 1
  expect_says "doesn't carry its tag as its label"
  expect_no_call 'ran migrate-staging'
  finish
else
  echo 'skip - the migration cases (jq is not installed)'
fi

printf '%s checks, %s failed\n' "$checks" "$failed"
[ "$failed" -eq 0 ]
