#!/bin/bash
# Export database schema from Docker PostgreSQL

echo "📦 Exporting database schema..."

docker exec helpx-mvp-db-1 pg_dump -U helpx -d helpxdb \
  --schema-only \
  --no-owner \
  --no-acl \
  > schema.sql

echo "✅ Schema exported to schema.sql"
echo "📝 Review schema.sql before importing to Supabase"

