#!/bin/sh
# Runs once, when the Postgres volume is empty: one role and database per app, each the owner of
# its database (Payload migrations and the rate_limit schema need CREATE there).
# The statements carry the passwords, and the server's log goes to the journal: Postgres logs a
# failing statement in full by default (log_min_error_statement), and can log any statement
# through log_statement or log_min_duration_statement. So the session turns all three off first.
set -eu

psql -v ON_ERROR_STOP=1 --username postgres \
  -v app_pw="$APP_DB_PASSWORD" -v staging_pw="$STAGING_DB_PASSWORD" -v umami_pw="$UMAMI_DB_PASSWORD" <<'SQL'
SET log_statement = 'none';
SET log_min_duration_statement = -1;
SET log_min_error_statement = panic;
CREATE ROLE jainav LOGIN PASSWORD :'app_pw';
CREATE DATABASE jainav OWNER jainav;
CREATE ROLE jainav_staging LOGIN PASSWORD :'staging_pw';
CREATE DATABASE jainav_staging OWNER jainav_staging;
CREATE ROLE umami LOGIN PASSWORD :'umami_pw';
CREATE DATABASE umami OWNER umami;
SQL
