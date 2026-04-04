#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

mkdir -p pb_data

if [[ "${1:-}" == "--init-env" && ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

chmod +x pocketbase start.sh

echo "Install complete. Next step: edit .env then run ./start.sh"
