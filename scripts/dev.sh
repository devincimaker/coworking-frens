#!/usr/bin/env bash

set -euo pipefail

port=${PORT:-}
if [ -z "$port" ] && [ -f .env.worktree ]; then
  port=$(sed -n 's/^FRENS_APP_PORT=//p' .env.worktree | tail -n 1)
fi
port=${port:-3000}

exec next dev --port "$port" "$@"
