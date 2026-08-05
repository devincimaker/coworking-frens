#!/usr/bin/env bash

set -euo pipefail

WORKTREE_TOOLING_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
WORKTREE_COMPOSE_PROJECT="frens-worktrees"

worktree_die() {
  echo "Error: $*" >&2
  exit 1
}

worktree_git_common_dir() {
  git rev-parse --path-format=absolute --git-common-dir
}

worktree_primary_path() {
  dirname "$(worktree_git_common_dir)"
}

worktree_state_dir() {
  printf '%s/frens-worktrees\n' "$(worktree_git_common_dir)"
}

WORKTREE_LOCK_HELD=""

# Serialize a critical section across the worktrees sharing this repo. mkdir is
# atomic, so whichever process creates the directory owns the lock.
#
# Hold one only around genuinely shared state — choosing a port, creating a
# database — and never around per-worktree work like installing dependencies or
# applying migrations. That distinction is the whole point: a lock held for the
# minutes an install takes turns parallel setups into a queue, while the section
# that actually needs protecting finishes in milliseconds.
worktree_lock() {
  local name=$1
  local timeout=${2:-120}
  local state_dir lock_dir owner waited=0

  state_dir=$(worktree_state_dir)
  mkdir -p "$state_dir"
  lock_dir="$state_dir/${name}.lock"

  until mkdir "$lock_dir" 2>/dev/null; do
    # Reclaim a lock whose owner is gone (kill -9, a closed terminal). Without
    # this, one crashed setup would block every later one until it timed out.
    owner=$(cat "$lock_dir/pid" 2>/dev/null || true)
    if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then
      echo "Reclaiming the '$name' lock from dead process $owner..." >&2
      rm -rf "$lock_dir"
      continue
    fi
    waited=$((waited + 1))
    [ "$waited" -lt $((timeout * 10)) ] || worktree_die \
      "Timed out after ${timeout}s waiting for the '$name' lock held by ${owner:-another setup}. If nothing else is running, remove $lock_dir"
    sleep 0.1
  done

  printf '%s' "$$" > "$lock_dir/pid"
  WORKTREE_LOCK_HELD="$lock_dir"
}

worktree_unlock() {
  [ -n "$WORKTREE_LOCK_HELD" ] || return 0
  rm -rf "$WORKTREE_LOCK_HELD"
  WORKTREE_LOCK_HELD=""
}

worktree_read_value() {
  local file=$1
  local key=$2
  [ -f "$file" ] || return 1
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

worktree_upsert_env() {
  local file=$1
  local key=$2
  local value=$3
  local temp

  mkdir -p "$(dirname "$file")"
  touch "$file"
  temp=$(mktemp "${file}.XXXXXX")
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 {
      if (!found) print key "=" value
      found = 1
      next
    }
    { print }
    END { if (!found) print key "=" value }
  ' "$file" > "$temp"
  mv "$temp" "$file"
}

worktree_postgres_port() {
  local state_dir port_file port
  state_dir=$(worktree_state_dir)
  port_file="$state_dir/postgres-port"
  mkdir -p "$state_dir"

  if [ -f "$port_file" ]; then
    port=$(tr -d '[:space:]' < "$port_file")
    case "$port" in
      ''|*[!0-9]*) worktree_die "Invalid saved Postgres port in $port_file" ;;
      *) printf '%s\n' "$port"; return ;;
    esac
  fi

  port=55440
  while [ "$port" -le 55479 ]; do
    if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      printf '%s\n' "$port" > "$port_file"
      printf '%s\n' "$port"
      return
    fi
    port=$((port + 1))
  done

  worktree_die "No free shared Postgres port found in 55440-55479"
}

worktree_compose() {
  local postgres_port
  postgres_port=$(worktree_postgres_port)
  FRENS_POSTGRES_PORT="$postgres_port" docker compose \
    --project-name "$WORKTREE_COMPOSE_PROJECT" \
    --file "$WORKTREE_TOOLING_ROOT/compose.worktrees.yml" \
    "$@"
}

worktree_path_for_branch() {
  local branch=$1
  git worktree list --porcelain | awk -v ref="refs/heads/$branch" '
    $1 == "worktree" { path = substr($0, 10) }
    $1 == "branch" && $2 == ref { print path; exit }
  '
}

worktree_branch_for_path() {
  local wanted=$1
  git worktree list --porcelain | awk -v wanted="$wanted" '
    $1 == "worktree" { path = substr($0, 10) }
    $1 == "branch" && path == wanted {
      sub("refs/heads/", "", $2)
      print $2
      exit
    }
  '
}

worktree_port_is_assigned() {
  local wanted=$1 path env_file assigned
  while IFS= read -r path; do
    env_file="$path/.env.worktree"
    assigned=$(worktree_read_value "$env_file" "FRENS_APP_PORT" 2>/dev/null || true)
    if [ "$assigned" = "$wanted" ]; then
      return 0
    fi
  done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
  return 1
}
