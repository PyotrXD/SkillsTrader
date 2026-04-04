#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo ".env not found. Copy .env.example to .env and configure it."
  exit 1
fi

set -a
source .env
set +a

if [[ -z "${PB_ENCRYPTION_KEY:-}" || ${#PB_ENCRYPTION_KEY} -ne 32 ]]; then
  echo "PB_ENCRYPTION_KEY must be exactly 32 characters in .env"
  exit 1
fi

exec ./pocketbase serve \
  --http 127.0.0.1:8091 \
  --dir pb_data \
  --hooksDir pb_hooks \
  --publicDir skillstrader-frontend/dist \
  --encryptionEnv PB_ENCRYPTION_KEY
