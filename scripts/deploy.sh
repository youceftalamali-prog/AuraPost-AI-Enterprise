#!/usr/bin/env bash
# AuraPost AI — self-hosted VPS deploy helper.
# Pulls the latest code, rebuilds the image and restarts the stack, then waits
# for the app health check. Safe to re-run (idempotent).
#
# Usage: bash scripts/deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and configure it first." >&2
  exit 1
fi

if [ ! -f certs/fullchain.pem ] || [ ! -f certs/privkey.pem ]; then
  echo "ERROR: TLS certs missing in ./certs (fullchain.pem, privkey.pem)." >&2
  echo "       Provide real certs or run: bash scripts/generate-dev-certs.sh" >&2
  exit 1
fi

echo "==> Building and starting containers"
docker compose up -d --build

echo "==> Waiting for app health check"
for i in $(seq 1 30); do
  if docker compose exec -T app wget -qO- http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "==> App is healthy"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "ERROR: App did not become healthy in time. Recent logs:" >&2
docker compose logs --tail=50 app >&2
exit 1
