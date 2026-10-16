# Nightly encrypted pg_dump to R2 (spec §18.4). Same Postgres major as the database.
FROM postgres:18-alpine
RUN apk add --no-cache age rclone curl
# rclone is configured entirely through RCLONE_CONFIG_BACKUPS_* variables.
ENV RCLONE_CONFIG=/dev/null
COPY --chmod=755 backup.sh restore-test.sh /usr/local/bin/
# 02:30 IST = 21:00 UTC (the container clock is UTC).
RUN echo '0 21 * * * /usr/local/bin/backup.sh' > /etc/crontabs/root
ENTRYPOINT []
CMD ["crond", "-f", "-l", "6"]
