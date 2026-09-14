#!/usr/bin/env bash
# Run Next dev only from the project root (avoids broken servers on :3000 with cwd /).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec npm run dev
