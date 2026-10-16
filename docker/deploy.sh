#!/bin/sh
# Runs on the VPS (/srv/jainav/deploy.sh), called by .github/workflows/deploy.yml:
#   deploy.sh app|app-staging <image>
# Points the service at the new image, waits for its healthcheck (which also applies pending
# migrations) and rolls back to the previous image if it never turns healthy.
set -eu
cd "${DEPLOY_DIR:-/srv/jainav}"

service=$1
image=$2
case $service in
  app) var=APP_IMAGE ;;
  app-staging) var=STAGING_IMAGE ;;
  *) echo "unknown service: $service" >&2; exit 2 ;;
esac

compose() { docker compose -f compose.prod.yml "$@"; }
point_to() { sed -i "s|^$var=.*|$var=$1|" .env; compose up -d --no-deps "$service"; }
healthy() {
  for _ in $(seq 1 60); do
    id=$(compose ps -q "$service")
    case $(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null) in
      healthy) return 0 ;;
      unhealthy) return 1 ;;
    esac
    sleep 5
  done
  return 1
}

previous=$(sed -n "s|^$var=||p" .env)
# Images are pulled from GHCR; a local-only tag (a rehearsal) is used as it is.
docker pull "$image" || docker image inspect "$image" >/dev/null
point_to "$image"
if healthy; then
  echo "$(date -u +%FT%TZ) $service $previous -> $image" >>deploys.log
  # Old images of this environment (staging-* or prod-*), except the new one and the rollback
  # target; images in use by a container are skipped by docker rmi.
  tag_prefix=${image##*:}
  tag_prefix=${tag_prefix%%-*}-
  docker images --format '{{.Repository}}:{{.Tag}}' "${image%:*}" |
    grep -F ":$tag_prefix" | grep -vxF -e "$image" -e "$previous" |
    xargs -r docker rmi >/dev/null 2>&1 || true
  docker image prune -f >/dev/null
  echo "$service is running $image"
else
  echo "$service did not become healthy on $image; rolling back to $previous" >&2
  compose logs --tail 100 "$service" >&2
  point_to "$previous"
  exit 1
fi
