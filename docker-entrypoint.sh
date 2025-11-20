#!/bin/sh
set -e

echo "Environment: ${NODE_ENV:-development}"
echo "Debug - DB_HOST: ${DB_HOST}"
echo "Debug - DB_PORT: ${DB_PORT}"
echo "Debug - DB_USER: ${DB_USER}"
echo "Debug - DB_NAME: ${DB_NAME}"
echo "Debug - DB_SSL: ${DB_SSL}"

# Only run rollback in development
if [ "${NODE_ENV}" != "production" ]; then
  echo "Running database rollback (if needed)..."
  npm run rollback || true
fi

echo "Running migrations..."
# Use production migration command (without type generation) for containers
npm run migrate:prod

# Only seed in development or if explicitly requested
if [ "${NODE_ENV}" != "production" ] || [ "${RUN_SEED}" = "true" ]; then
  echo "Seeding database..."
  npm run seed:prod || echo "Seeding skipped or failed (non-fatal)"
fi

echo "Starting the backend..."
exec "$@"