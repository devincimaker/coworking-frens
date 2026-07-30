#!/usr/bin/env bash

# Applies pending migrations during a build — except on Vercel preview
# deployments.
#
# A preview is built from an open PR, so its migrations are by definition
# unreviewed. Whether that is dangerous depends on which database the Neon
# integration hands the preview: its own branch (harmless) or the one
# production uses (an unreviewed schema change landing in production the
# moment someone opens a PR). Rather than depend on which, previews build
# without migrating and read whatever schema is already there.
#
# Production and local builds are untouched: VERCEL_ENV is "production" on a
# production deploy and unset on a laptop, and both fall through to migrate.

set -euo pipefail

if [ "${VERCEL_ENV:-}" = "preview" ]; then
  echo "▲ preview deployment — skipping 'prisma migrate deploy'"
  exit 0
fi

exec npx prisma migrate deploy
