#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=worktree-common.sh
source "$SCRIPT_DIR/worktree-common.sh"

branch=${1:-}
base=${2:-HEAD}

if [ -z "$branch" ]; then
  echo "Usage: npm run wt:new -- <branch-name> [base-ref]" >&2
  exit 1
fi

git check-ref-format --branch "$branch" >/dev/null 2>&1 || worktree_die "Invalid branch name: $branch"

primary=$(worktree_primary_path)
repo_name=$(basename "$primary")
directory_name=$(printf '%s' "$branch" | tr '/[:space:]' '--' | tr -cd '[:alnum:]_.-')
[ -n "$directory_name" ] || worktree_die "Branch name does not produce a usable directory name"

worktree_root=${FRENS_WORKTREE_ROOT:-"$(dirname "$primary")/${repo_name}-worktrees"}
target="$worktree_root/$directory_name"

[ ! -e "$target" ] || worktree_die "Target already exists: $target"
mkdir -p "$worktree_root"

if git show-ref --verify --quiet "refs/heads/$branch"; then
  [ -z "$(worktree_path_for_branch "$branch")" ] || worktree_die "Branch is already checked out: $branch"
  git worktree add "$target" "$branch"
else
  git rev-parse --verify "$base^{commit}" >/dev/null 2>&1 || worktree_die "Unknown base ref: $base"
  git worktree add -b "$branch" "$target" "$base"
fi

if ! "$SCRIPT_DIR/worktree-setup.sh" "$target"; then
  echo >&2
  echo "The Git worktree was created, but setup did not finish." >&2
  echo "Fix the reported issue, then run: $SCRIPT_DIR/worktree-setup.sh '$target'" >&2
  exit 1
fi

echo
echo "Ready. Open the worktree with:"
echo "  cd $target"
