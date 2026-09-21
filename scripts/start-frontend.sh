#!/bin/sh
set -eu

: "${PORT:=80}"
: "${API_UPSTREAM_URL:=${API_UPSTREAM:-http://api:3000}}"
envsubst '${API_UPSTREAM_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
