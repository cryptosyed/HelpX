#!/bin/bash
# Export full database (schema + data) from Docker PostgreSQL

echo "📦 Exporting full database backup..."

docker exec helpx-mvp-db-1 pg_dump -U helpx -d helpxdb \
  --no-owner \
  --no-acl \
  > full_backup.sql

echo "✅ Full backup exported to full_backup.sql"
echo "📝 This includes both schema and data"

