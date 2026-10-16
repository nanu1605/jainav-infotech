#!/bin/sh
# Runs once, when the Postgres volume is empty: one role and database per app, each the owner of
# its database (Payload migrations and the rate_limit schema need CREATE there).
set -eu

psql -v ON_ERROR_STOP=1 --username postgres \
  -v app_pw="$APP_DB_PASSWORD" -v staging_pw="$STAGING_DB_PASSWORD" -v umami_pw="$UMAMI_DB_PASSWORD" <<'SQL'
CREATE ROLE jainav LOGIN PASSWORD :'app_pw';
CREATE DATABASE jainav OWNER jainav;
CREATE ROLE jainav_staging LOGIN PASSWORD :'staging_pw';
CREATE DATABASE jainav_staging OWNER jainav_staging;
CREATE ROLE umami LOGIN PASSWORD :'umami_pw';
CREATE DATABASE umami OWNER umami;
SQL
