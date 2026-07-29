#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=worktree-common.sh
source "$SCRIPT_DIR/worktree-common.sh"

primary=$(worktree_primary_path)

printf '%-28s %-8s %-34s %s\n' "BRANCH" "PORT" "DATABASE" "PATH"
git worktree list --porcelain | awk '
  function emit() {
    if (path != "") print path "\t" branch
  }
  $1 == "worktree" { emit(); path = substr($0, 10); branch = "(detached)" }
  $1 == "branch" { branch = $2; sub("refs/heads/", "", branch) }
  END { emit() }
' | while IFS=$'\t' read -r path branch; do
  if [ "$path" = "$primary" ]; then
    printf '%-28s %-8s %-34s %s\n' "$branch" "3000*" "primary env*" "$path"
  else
    port=$(worktree_read_value "$path/.env.worktree" "FRENS_APP_PORT" 2>/dev/null || printf '%s' "-")
    database=$(worktree_read_value "$path/.env.worktree" "FRENS_DB_NAME" 2>/dev/null || printf '%s' "-")
    printf '%-28s %-8s %-34s %s\n' "$branch" "$port" "$database" "$path"
  fi
done

echo "* The primary checkout is intentionally not managed or changed by worktree setup."
