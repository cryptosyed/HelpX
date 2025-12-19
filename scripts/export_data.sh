#!/bin/bash
# Export database data from Docker PostgreSQL

echo "📦 Exporting database data..."

docker exec helpx-mvp-db-1 pg_dump -U helpx -d helpxdb \
  --data-only \
  --no-owner \
  --no-acl \
  > data.sql

echo "✅ Data exported to data.sql"
echo "📝 Review data.sql before importing to Supabase"

