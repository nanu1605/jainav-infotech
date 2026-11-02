# Nightly encrypted pg_dump to R2 (spec §18.4). Same Postgres major as the database.
FROM postgres:17-alpine
RUN apk add --no-cache age rclone curl
# rclone is configured entirely through RCLONE_CONFIG_BACKUPS_* variables.
ENV RCLONE_CONFIG=/dev/null
COPY --chmod=755 backup.sh restore-test.sh prune-umami.sh /usr/local/bin/
# 02:30 IST = 21:00 UTC (the container clock is UTC); the prune an hour later does nothing unless
# UMAMI_RETENTION_DAYS is set.
RUN printf '0 21 * * * /usr/local/bin/backup.sh\n0 22 * * * /usr/local/bin/prune-umami.sh\n' > /etc/crontabs/root
ENTRYPOINT []
CMD ["crond", "-f", "-l", "6"]
