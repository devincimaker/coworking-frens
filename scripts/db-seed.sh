#!/usr/bin/env bash

set -euo pipefail

app_url=${APP_URL:-}
if [ -z "$app_url" ] && [ -f .env.worktree ]; then
  port=$(sed -n 's/^FRENS_APP_PORT=//p' .env.worktree | tail -n 1)
  app_url="http://localhost:$port"
fi
app_url=${app_url:-http://localhost:3000}

curl -fsS "$app_url/api/dev/seed"
