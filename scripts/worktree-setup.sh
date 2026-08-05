#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=worktree-common.sh
source "$SCRIPT_DIR/worktree-common.sh"

target=${1:-$(pwd)}
[ -d "$target" ] || worktree_die "Worktree path does not exist: $target"
target=$(cd "$target" && pwd)

primary=$(worktree_primary_path)
[ "$target" != "$primary" ] || worktree_die "The primary checkout stays opt-in and unchanged; setup is only for linked worktrees"

target_common=$(git -C "$target" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
[ "$target_common" = "$(worktree_git_common_dir)" ] || worktree_die "$target is not a worktree for this repository"

branch=$(git -C "$target" branch --show-current)
[ -n "$branch" ] || worktree_die "Worktree must be on a branch, not detached HEAD"

trap 'worktree_unlock' EXIT

# Picking a port and a database name is the one part two setups must not do at
# once: scanning concurrently, both could land on 3100. It is also quick, and
# everything after it touches only this worktree, so the lock is released as
# soon as the choice is recorded in .env.worktree — where the next setup's scan
# will see it — rather than being carried through the install below.
worktree_lock alloc

metadata="$target/.env.worktree"
app_port=$(worktree_read_value "$metadata" "FRENS_APP_PORT" 2>/dev/null || true)
if [ -z "$app_port" ]; then
  app_port=3100
  while [ "$app_port" -le 3199 ]; do
    if ! worktree_port_is_assigned "$app_port" && ! lsof -nP -iTCP:"$app_port" -sTCP:LISTEN >/dev/null 2>&1; then
      break
    fi
    app_port=$((app_port + 1))
  done
  [ "$app_port" -le 3199 ] || worktree_die "No free app port found in 3100-3199"
fi

db_name=$(worktree_read_value "$metadata" "FRENS_DB_NAME" 2>/dev/null || true)
if [ -z "$db_name" ]; then
  db_slug=$(printf '%s' "$branch" | tr '[:upper:]/.-' '[:lower:]___' | tr -cd '[:alnum:]_' | cut -c1-40)
  db_hash=$(printf '%s' "$branch" | git hash-object --stdin | cut -c1-8)
  db_name="frens_${db_slug}_${db_hash}"
fi

postgres_port=$(worktree_postgres_port)
cat > "$metadata" <<EOF
FRENS_APP_PORT=$app_port
FRENS_DB_NAME=$db_name
FRENS_POSTGRES_PORT=$postgres_port
EOF

worktree_unlock

if [ ! -f "$target/.env" ]; then
  if [ -f "$primary/.env" ]; then
    cp "$primary/.env" "$target/.env"
  else
    cp "$target/.env.example" "$target/.env"
  fi
fi

if [ ! -f "$target/.env.local" ] && [ -f "$primary/.env.local" ]; then
  cp "$primary/.env.local" "$target/.env.local"
fi

database_url="postgresql://frens:frens@127.0.0.1:${postgres_port}/${db_name}?schema=public"
for env_file in "$target/.env" "$target/.env.local"; do
  worktree_upsert_env "$env_file" "DATABASE_URL" "$database_url"
  worktree_upsert_env "$env_file" "DATABASE_URL_UNPOOLED" "$database_url"
  worktree_upsert_env "$env_file" "DIRECT_URL" "$database_url"
  worktree_upsert_env "$env_file" "APP_URL" "http://localhost:$app_port"
done

if [ ! -d "$target/node_modules" ]; then
  if [ -d "$primary/node_modules" ] && cmp -s "$primary/package-lock.json" "$target/package-lock.json"; then
    echo "Cloning node_modules from the primary checkout..."
    if ! cp -cR "$primary/node_modules" "$target/" 2>/dev/null; then
      echo "Fast clone unavailable; installing from the npm cache..."
      rm -rf "$target/node_modules"
      (cd "$target" && npm ci --prefer-offline --no-audit)
    fi
  else
    echo "Installing dependencies..."
    (cd "$target" && npm ci --prefer-offline --no-audit)
  fi
fi

# The container and the database are shared, so this is serialized too — but
# only this. Compose returns straight away once the service is already healthy,
# which it is for every setup after the first.
worktree_lock postgres
echo "Starting the shared Postgres service..."
worktree_compose up -d --wait postgres

if ! worktree_compose exec -T postgres psql -U frens -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$db_name'" | grep -q 1; then
  worktree_compose exec -T postgres createdb -U frens "$db_name"
fi
worktree_unlock

echo "Applying migrations to $db_name..."
(cd "$target" && ./node_modules/.bin/prisma generate && ./node_modules/.bin/prisma migrate deploy)

echo
echo "Worktree ready:"
echo "  Branch:   $branch"
echo "  Path:     $target"
echo "  App:      http://localhost:$app_port"
echo "  Database: $db_name (shared Postgres on port $postgres_port)"
echo "  Start:    npm run dev"
echo "  Seed:     npm run db:seed (after the dev server is running)"
