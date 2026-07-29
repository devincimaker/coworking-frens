#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=worktree-common.sh
source "$SCRIPT_DIR/worktree-common.sh"

target_arg=${1:-}
if [ -z "$target_arg" ]; then
  echo "Usage: npm run wt:remove -- <branch-name-or-worktree-path>" >&2
  exit 1
fi

primary=$(worktree_primary_path)
if [ -d "$target_arg" ]; then
  target=$(cd "$target_arg" && pwd)
else
  target=$(worktree_path_for_branch "$target_arg")
fi

[ -n "${target:-}" ] || worktree_die "No worktree found for: $target_arg"
[ "$target" != "$primary" ] || worktree_die "The primary checkout cannot be removed by this command"

branch=$(worktree_branch_for_path "$target")
[ -n "$branch" ] || worktree_die "Refusing to remove a detached worktree"

if [ -n "$(git -C "$target" status --porcelain)" ]; then
  git -C "$target" status --short
  worktree_die "Worktree has uncommitted changes; commit or stash them first"
fi

metadata="$target/.env.worktree"
app_port=$(worktree_read_value "$metadata" "FRENS_APP_PORT" 2>/dev/null || true)
db_name=$(worktree_read_value "$metadata" "FRENS_DB_NAME" 2>/dev/null || true)

if [ -n "$app_port" ] && lsof -nP -iTCP:"$app_port" -sTCP:LISTEN >/dev/null 2>&1; then
  worktree_die "Port $app_port is still in use; stop this worktree's dev server first"
fi

if [ -n "$db_name" ]; then
  echo "Dropping isolated database $db_name..."
  worktree_compose up -d --wait postgres >/dev/null
  worktree_compose exec -T postgres dropdb --if-exists --force -U frens "$db_name"
fi

cd "$primary"
git worktree remove "$target"

if git merge-base --is-ancestor "$branch" main 2>/dev/null; then
  git branch -d "$branch"
  branch_result="deleted (already merged into main)"
else
  branch_result="kept (not merged into main)"
fi

echo "Removed worktree: $target"
echo "Branch $branch: $branch_result"
