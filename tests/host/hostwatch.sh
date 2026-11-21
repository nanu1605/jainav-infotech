#!/bin/bash
# Runs the alert path of docker/host/hostwatch (judge, check_oom, daily_reboot and tg_recover, with
# notify and tg_send under them) against stubs (tests/host/hostwatch-stubs) of curl and journalctl,
# and checks what reaches Telegram, what is printed and what is saved. It sources a copy of
# hostwatch without its main line and with its fixed paths moved into a temporary directory, so
# this needs no root, Docker, network or server. CI runs it on ubuntu-24.04; Git Bash runs it too.
#   bash tests/host/hostwatch.sh
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d)
out=$T/out
name='' ended=0
# A hostwatch function that fails outside a condition stops this script (set -e): say in which case.
# shellcheck disable=SC2317,SC2329 # called by the EXIT trap
stopped() {
  local rc=$?
  if [ "$ended" -eq 0 ] && [ -n "$name" ]; then
    printf 'not ok - %s: the test stopped here (exit %s)\n' "$name" "$rc"
    if [ -s "$out" ]; then sed 's/^/    | /' "$out"; fi
  fi
  rm -rf "$T"
}
trap stopped EXIT
# What the stubs read: where they keep their logs, and the test bot's token and chat id.
export STUB_STATE=$T/stub STUB_TOKEN=123456:test-token STUB_CHAT=-1001

# The stubs are kept out of tests/host/stubs, which app-deploy.sh puts on its PATH. They run from
# this test's own bin directory, so their mode in git doesn't matter.
mkdir -p "$T/bin"
cp "$root/tests/host/hostwatch-stubs/curl" "$root/tests/host/hostwatch-stubs/journalctl" "$T/bin/"
chmod +x "$T/bin/curl" "$T/bin/journalctl"

# The copy under test: hostwatch without its main line, the stubs first on its PATH, and every
# fixed path the tested functions use moved into $T, each by its own anchored rewrite. A rewrite
# that doesn't take (the line moved or changed) stops the test before anything runs on a real path.
src=$root/docker/host/hostwatch
copy=$T/hostwatch
main_line='main "$@"'
moved=(ENV_FILE APPS_DIR STATE_DIR FLAG_DIR LOCK_DIR REBOOT_FILE)
rewrites=(-e "s|^PATH=/usr/sbin:|PATH=$T/bin:/usr/sbin:|" -e '/^main "\$@"$/d')
for v in "${moved[@]}"; do rewrites+=(-e "s|^$v=/|$v=$T/|"); done
sed "${rewrites[@]}" "$src" >"$copy"
# Its last line must be its one main "$@", and the copy must have none.
mains=$(grep -cxF -- "$main_line" "$src" || true)
if [ "$mains" != 1 ] || [ "$(tail -n 1 "$src")" != "$main_line" ] ||
  grep -qxF -- "$main_line" "$copy"; then
  echo "hostwatch's main line moved: update this test"
  exit 1
fi
if ! grep -q "^PATH=$T/bin:" "$copy"; then
  echo "hostwatch's PATH line moved: update this test"
  exit 1
fi
for v in "${moved[@]}"; do
  if [ "$(grep -c "^$v=" "$copy" || true)" != 1 ] || ! grep -q "^$v=$T/" "$copy"; then
    echo "hostwatch's $v line moved: update this test"
    exit 1
  fi
done

# Sourcing runs hostwatch's top level in this shell: set -euo pipefail (this script's own too),
# umask 022, LC_ALL=C and its PATH, from here on the stubs and the system directories only.
# shellcheck source=/dev/null
. "$copy"
# shellcheck disable=SC2153 # TG_FAILED is hostwatch's flag file, not a misspelt TG_FAILS
for p in "$ENV_FILE" "$APPS_DIR" "$STATE_DIR" "$FLAG_DIR" "$LOCK_DIR" "$REBOOT_FILE" "$TG_FAILED" \
  "$OUTBOX" "$THROTTLED_FLAG"; do
  case $p in
    "$T"/*) ;;
    *) echo "hostwatch would use $p, outside the test's directory: update this test"; exit 1 ;;
  esac
done
for c in curl journalctl; do
  if [ "$(command -v "$c" || true)" != "$T/bin/$c" ]; then
    echo "hostwatch would run the real $c: update this test"
    exit 1
  fi
done

# date +%s is the case's clock; any other date is the real one.
# shellcheck disable=SC2317,SC2329 # called by hostwatch's functions, sourced above
date() {
  if [ "$#" -eq 1 ] && [ "$1" = +%s ]; then printf '%s\n' "$clock"; else command date "$@"; fi
}

# Git Bash's file systems can't give a directory mode 0700, so install -m 0700 (state_init) fails
# there after making the directory. Only where that probe fails, install runs without its -m.
if ! install -d -m 0700 "$T/mode-probe" 2>/dev/null; then
  # shellcheck disable=SC2317,SC2329 # called by hostwatch's state_init and tg_failed
  install() {
    local -a args=()
    while [ "$#" -gt 0 ]; do
      if [ "$1" = -m ] && [ "$#" -ge 2 ]; then shift 2; else args+=("$1"); shift; fi
    done
    command install "${args[@]}"
  }
fi
rm -rf "$T/mode-probe"

t0=1700000000   # the clock when each case starts
disk85='disk: / is 85% used'
disk95='disk: / is 95% used'
disk50='disk: / is 50% used'
cid=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
scope=/system.slice/docker-$cid.scope
oom_line="oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=docker-$cid.scope"
oom_line+=",mems_allowed=0,oom_memcg=$scope,task_memcg=$scope,task=node,pid=4242,uid=1001"
oom_text='oom: kernel killed example-web-1 (node, hit its memory limit)'

env_file() {   # env_file LINE...: hostwatch.env is these lines, read by hostwatch's own load_env
  printf '%s\n' "$@" >"$ENV_FILE"
  load_env >"$out" 2>&1
}
# curl_exits CODE [METHOD]: curl's exit code from now on, for every call or only for that Bot API
# method's calls
curl_exits() { echo "$1" >"$STUB_STATE/curl-exit${2:+-$2}"; }

# A fresh case: empty state as state_init makes it, the test bot in hostwatch.env, a run as the
# 5-minute timer starts one, nothing sent yet, curl answering 0 and the clock at t0.
reset() {
  rm -rf "${T:?}/etc" "${T:?}/var" "${T:?}/run" "$STUB_STATE"
  mkdir -p "${ENV_FILE%/*}" "${REBOOT_FILE%/*}" "$STUB_STATE"
  state_init
  # shellcheck disable=SC2034 # MODE, CLEAR_RUNS and CONTAINERS are read by hostwatch's functions
  MODE=run CLEAR_RUNS=2 TG_FAILS=0 PROBLEMS=0 CONTAINERS=''
  rm -f "$TG_FAILED"
  : >"$STUB_STATE/curl.log"
  curl_exits 0
  clock=$t0
  env_file "BOT_TOKEN=$STUB_TOKEN" "CHAT_ID=$STUB_CHAT"
}

# The next run, SECONDS after t0. Each run is a new process, so its Telegram failures count from 0.
next_run() {   # next_run SECONDS
  clock=$((t0 + $1))
  TG_FAILS=0
  : >"$STUB_STATE/curl.log"
  : >"$STUB_STATE/journalctl.log"
}

# A saved cursor, then a kernel log with a noise line and one container's OOM kill after it.
oom_after_cursor() {
  # shellcheck disable=SC2034 # read by container_name, which names the container by its id
  CONTAINERS="$cid|example-web-1"
  echo test-cursor-1 >"$STATE_DIR/oom-cursor"
  printf '%s\n' 'Memory cgroup out of memory: Killed process 4242 (node)' "$oom_line" \
    >"$STUB_STATE/kernel"
  echo test-cursor-2 >"$STUB_STATE/cursor"
}

# The hostwatch functions run in this shell, never in $(...): a subshell would lose TG_FAILS and
# PROBLEMS. What they print goes to $out, which a failed check shows.
checks=0 failures=0 before=0
start() { name=$1; before=$failures; reset; }
finish() { if [ "$failures" -eq "$before" ]; then printf 'ok - %s\n' "$name"; fi; }
show() {   # show LABEL TEXT
  printf '%s\n' "${2:-(nothing)}" | sed "1s/^/    $1 /; 2,\$s/^/              /"
}
expect() {   # expect WHAT EXPECTED GOT: one check; a failure says what it expected and what it got
  checks=$((checks + 1))
  if [ "$2" = "$3" ]; then return 0; fi
  failures=$((failures + 1))
  printf 'not ok - %s: %s\n' "$name" "$1"
  show 'expected:' "$2"
  show 'got:     ' "$3"
  if [ -s "$out" ] && [ "$3" != "$(cat "$out")" ]; then sed 's/^/    | /' "$out"; fi
}
expect_sent() {   # expect_sent LINE...: this run's Telegram calls ("sendMessage silent|loud text")
  expect 'what reached Telegram' "$(printf '%s\n' "$@")" "$(cat "$STUB_STATE/curl.log")"
}
expect_sent_start() {   # expect_sent_start PREFIX: this run's one Telegram call starts with PREFIX
  local got
  got=$(cat "$STUB_STATE/curl.log")
  if [[ $got == "$1"* && $got != *$'\n'* ]]; then got="$1..."; fi
  expect 'what reached Telegram' "$1..." "$got"
}
expect_said() {   # expect_said LINE: the last call printed this line
  local got=$1
  if ! grep -qxF -- "$1" "$out"; then got=$(cat "$out"); fi
  expect 'what it printed' "$1" "$got"
}
expect_text() {   # expect_text WHAT FILE TEXT: a line of FILE holds TEXT
  local got=$3
  if ! grep -qF -- "$3" "$2" 2>/dev/null; then got=$(cat "$2" 2>/dev/null || true); fi
  expect "$1" "$3" "$got"
}
expect_state() {   # expect_state KEY FIELD=VALUE...: the alert's saved state has these values
  local f=$STATE_DIR/alerts/$1 line want='' got='no saved state'
  shift
  if [ -e "$f" ]; then got=''; fi
  for line in "$@"; do
    want+=$line$'\n'
    if [ -e "$f" ]; then got+=$(grep -m 1 -e "^${line%%=*}=" "$f" || echo "no ${line%%=*}")$'\n'; fi
  done
  expect "the saved state of ${f##*/}" "${want%$'\n'}" "${got%$'\n'}"
}
expect_no_state() {   # expect_no_state KEY: nothing is saved for the alert
  local got='no saved state'
  if [ -e "$STATE_DIR/alerts/$1" ]; then got=$(cat "$STATE_DIR/alerts/$1"); fi
  expect "the saved state of $1" 'no saved state' "$got"
}
expect_flag() {   # expect_flag set|absent: TG_FAILED, which stops the heartbeat while sends fail
  local got='absent'
  if [ -e "$TG_FAILED" ]; then got='set'; fi
  expect 'the tg-failed flag' "$1" "$got"
}
expect_cursor() {   # expect_cursor VALUE: the journal cursor check_oom saved
  local got='no saved cursor'
  if [ -e "$STATE_DIR/oom-cursor" ]; then got=$(cat "$STATE_DIR/oom-cursor"); fi
  expect 'the saved oom cursor' "$1" "$got"
}

start 'notify is defined: judge and check_oom send through it'
expect 'declare -F notify' notify "$(declare -F notify || true)"
finish

start 'a new problem is sent once, printed and saved'
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent "sendMessage loud [server] $disk85"
expect_said "alert: $disk85"
expect_state disk "since=$t0" "last=$t0" level=1 ok=0 "text=$disk85"
expect 'PROBLEMS' 1 "$PROBLEMS"
expect_flag absent
finish

start 'a lasting problem is not sent again within 6 h, then sent as still'
judge disk 1 "$disk85" >"$out" 2>&1
next_run 3600
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent
expect_state disk "since=$t0" "last=$t0"
next_run 21600
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent "sendMessage loud [server] still: $disk85 (for 6 h 0 min)"
expect_state disk "since=$t0" "last=$((t0 + 21600))"
finish

start 'a higher level is sent at once, as CRITICAL, and the episode keeps it'
judge disk 1 "$disk85" >"$out" 2>&1
next_run 300
judge disk 2 "$disk95" >"$out" 2>&1
expect_sent "sendMessage loud [server] CRITICAL $disk95"
expect_state disk "since=$t0" "last=$((t0 + 300))" level=2
next_run 600
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent
expect_state disk level=2
finish

start 'a new offender is sent at once, one already seen is not'
judge unhealthy 2 'unhealthy: example-web-1' ' example-web-1' >"$out" 2>&1
next_run 300
judge unhealthy 2 'unhealthy: example-web-1 example-db-1' ' example-web-1 example-db-1' \
  >"$out" 2>&1
expect_sent 'sendMessage loud [server] CRITICAL unhealthy: example-web-1 example-db-1'
expect_state unhealthy 'items= example-web-1 example-db-1'
next_run 600
judge unhealthy 2 'unhealthy: example-db-1' ' example-db-1' >"$out" 2>&1
expect_sent
finish

start 'two clean runs resolve a problem with one silent line'
judge disk 1 "$disk85" >"$out" 2>&1
next_run 300
judge disk 0 "$disk50" >"$out" 2>&1
expect_sent
expect_state disk ok=1
next_run 600
judge disk 0 "$disk50" >"$out" 2>&1
expect_sent 'sendMessage silent [server] resolved: disk (clear after 10 min)'
expect_said 'alert: resolved: disk (clear after 10 min)'
expect_no_state disk
next_run 900
judge disk 0 "$disk50" >"$out" 2>&1
expect_sent
expect_no_state disk
finish

start 'a failed send saves nothing and sets the flag; the next run sends it'
curl_exits 22
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent "sendMessage loud [server] $disk85"
expect_said 'hostwatch: Telegram did not take the message (curl exit 22)'
expect_no_state disk
expect_flag set
expect 'TG_FAILS' 1 "$TG_FAILS"
next_run 300
curl_exits 0
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent "sendMessage loud [server] $disk85"
expect_state disk "since=$((t0 + 300))" "last=$((t0 + 300))"
expect_flag absent
finish

start 'a failed escalation or repeat leaves the saved state as it was; the next run sends it'
judge disk 1 "$disk85" >"$out" 2>&1
next_run 300
curl_exits 22
judge disk 2 "$disk95" >"$out" 2>&1
expect_sent "sendMessage loud [server] CRITICAL $disk95"
expect_state disk "last=$t0" level=1
next_run 600
curl_exits 0
judge disk 2 "$disk95" >"$out" 2>&1
expect_sent "sendMessage loud [server] CRITICAL $disk95"
expect_state disk "last=$((t0 + 600))" level=2
next_run 22200
curl_exits 22
judge disk 2 "$disk95" >"$out" 2>&1
expect_sent "sendMessage loud [server] still: CRITICAL $disk95 (for 6 h 10 min)"
expect_state disk "last=$((t0 + 600))"
next_run 22500
curl_exits 0
judge disk 2 "$disk95" >"$out" 2>&1
expect_sent "sendMessage loud [server] still: CRITICAL $disk95 (for 6 h 15 min)"
expect_state disk "since=$t0" "last=$((t0 + 22500))"
finish

start 'a failed "resolved" keeps the state; the next clean run sends it'
judge disk 1 "$disk85" >"$out" 2>&1
next_run 300
judge disk 0 "$disk50" >"$out" 2>&1
next_run 600
curl_exits 22
judge disk 0 "$disk50" >"$out" 2>&1
expect_sent 'sendMessage silent [server] resolved: disk (clear after 10 min)'
expect_state disk "since=$t0" ok=1
expect_flag set
next_run 900
curl_exits 0
judge disk 0 "$disk50" >"$out" 2>&1
expect_sent 'sendMessage silent [server] resolved: disk (clear after 15 min)'
expect_no_state disk
expect_flag absent
finish

start 'without a bot alerts are printed and count as delivered, and nothing is sent'
env_file '# no bot set up' 'BOT_TOKEN=' 'CHAT_ID='
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent
expect_said "alert: $disk85"
expect_state disk "since=$t0" "last=$t0"
next_run 300
judge disk 0 "$disk50" >"$out" 2>&1
next_run 600
judge disk 0 "$disk50" >"$out" 2>&1
expect_said 'alert: resolved: disk (clear after 10 min)'
expect_no_state disk
oom_after_cursor
check_oom >"$out" 2>&1
expect_said "alert: $oom_text"
expect_cursor test-cursor-2
expect_sent
expect_flag absent
finish

start 'a malformed BOT_TOKEN sends and saves nothing and sets the flag'
env_file 'BOT_TOKEN=not-a-bot-token' "CHAT_ID=$STUB_CHAT"
expect_said "hostwatch: BOT_TOKEN in $ENV_FILE is not a bot token; no message can be sent"
judge disk 1 "$disk85" >"$out" 2>&1
expect_sent
expect_no_state disk
expect_flag set
finish

start 'after TG_MAX_FAILS failed sends a run calls Telegram no more'
curl_exits 22
for ((i = 1; i <= TG_MAX_FAILS; i++)); do judge "check$i" 1 "check$i: a problem" >"$out" 2>&1; done
expect 'Telegram calls that failed' "$TG_MAX_FAILS" "$(grep -c . "$STUB_STATE/curl.log" || true)"
: >"$STUB_STATE/curl.log"
curl_exits 0
judge swap 1 'swap: 3.0 GiB in use (alert above 2.0 GiB)' >"$out" 2>&1
expect_sent
expect_no_state swap
finish

# getChat can answer while sendMessage is refused (a bot that may not post, a rate limit), so the
# probe must not clear the flag that a send in the same run has just set.
start 'a failed send keeps the flag though getChat answers; a run with nothing to send clears it'
curl_exits 22 sendMessage
judge disk 1 "$disk85" >"$out" 2>&1
tg_recover >"$out" 2>&1
expect_sent "sendMessage loud [server] $disk85"
expect_flag set
next_run 300
judge disk 0 "$disk50" >"$out" 2>&1
tg_recover >"$out" 2>&1
expect_sent getChat
expect_flag absent
finish

start 'hostwatch check prints WARN and CRIT, and sends and saves nothing'
# shellcheck disable=SC2034 # read by judge
MODE=check
judge disk 1 "$disk85" >"$out" 2>&1
expect_said "WARN  $disk85"
judge disk 2 "$disk95" >"$out" 2>&1
expect_said "CRIT  $disk95"
expect_sent
expect_no_state disk
expect 'PROBLEMS' 2 "$PROBLEMS"
finish

start 'the first OOM check saves where the kernel log ends and sends nothing'
printf '%s\n' "$oom_line" >"$STUB_STATE/kernel"
echo test-cursor-1 >"$STUB_STATE/cursor"
check_oom >"$out" 2>&1
expect_sent
expect_cursor test-cursor-1
finish

start 'an OOM check with no kill after the cursor sends nothing and moves the cursor'
echo test-cursor-1 >"$STATE_DIR/oom-cursor"
echo 'a kernel line that is no OOM kill' >"$STUB_STATE/kernel"
echo test-cursor-2 >"$STUB_STATE/cursor"
check_oom >"$out" 2>&1
expect_sent
expect_text 'the journalctl call' "$STUB_STATE/journalctl.log" --after-cursor=test-cursor-1
expect_cursor test-cursor-2
expect 'PROBLEMS' 0 "$PROBLEMS"
finish

start 'an OOM kill after the saved cursor is sent, and the cursor moves on'
oom_after_cursor
check_oom >"$out" 2>&1
expect_sent "sendMessage loud [server] $oom_text"
expect_said "alert: $oom_text"
expect_text 'the journalctl call' "$STUB_STATE/journalctl.log" --after-cursor=test-cursor-1
expect_cursor test-cursor-2
expect 'PROBLEMS' 1 "$PROBLEMS"
finish

start 'an OOM kill that Telegram refuses keeps the old cursor; the next run sends it'
oom_after_cursor
curl_exits 22
check_oom >"$out" 2>&1
expect_sent "sendMessage loud [server] $oom_text"
expect_cursor test-cursor-1
expect_flag set
next_run 300
curl_exits 0
check_oom >"$out" 2>&1
expect_sent "sendMessage loud [server] $oom_text"
expect_text 'the journalctl call' "$STUB_STATE/journalctl.log" --after-cursor=test-cursor-1
expect_cursor test-cursor-2
expect_flag absent
finish

start 'a pending reboot is sent with its package list'
: >"$REBOOT_FILE"
printf '%s\n' example-pkg-a example-pkg-b >"$REBOOT_FILE.pkgs"
daily_reboot >"$out" 2>&1
expect_sent_start 'sendMessage loud [server] reboot: needed (example-pkg-a example-pkg-b'
expect_state reboot "since=$t0" "last=$t0" level=1
finish

start 'the daily run (CLEAR_RUNS=1) resolves after one clean run'
# shellcheck disable=SC2034 # read by judge
CLEAR_RUNS=1
: >"$REBOOT_FILE"
echo example-pkg-a >"$REBOOT_FILE.pkgs"
daily_reboot >"$out" 2>&1
rm "$REBOOT_FILE" "$REBOOT_FILE.pkgs"
next_run 86400
daily_reboot >"$out" 2>&1
expect_sent 'sendMessage silent [server] resolved: reboot (clear after 1 d 0 h)'
expect_no_state reboot
finish

ended=1
printf '%s checks, %s failed\n' "$checks" "$failures"
[ "$failures" -eq 0 ]
