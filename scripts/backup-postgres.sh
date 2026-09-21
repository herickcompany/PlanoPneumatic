#!/usr/bin/env sh
set -eu

OUTPUT_DIRECTORY="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$OUTPUT_DIRECTORY"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUTPUT_DIRECTORY/plano-pneumatic-$TIMESTAMP.sql"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-plano_pneumatic}" --format=plain --no-owner --no-privileges > "$FILE"
find "$OUTPUT_DIRECTORY" -name '*.sql' -type f -mtime "+$RETENTION_DAYS" -delete
echo "Backup criado em $FILE"
