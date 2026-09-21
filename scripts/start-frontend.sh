#!/bin/sh
set -eu

: "${PORT:=80}"
: "${API_UPSTREAM_URL:=${API_UPSTREAM:-http://api:3000}}"
case "$API_UPSTREAM_URL" in
	http://*|https://*) ;;
	*) API_UPSTREAM_URL="https://$API_UPSTREAM_URL" ;;
esac
API_UPSTREAM_URL="${API_UPSTREAM_URL%/}"
export API_UPSTREAM_URL
envsubst '${API_UPSTREAM_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
