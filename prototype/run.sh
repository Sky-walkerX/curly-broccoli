#!/usr/bin/env bash
# One command to run the Multi-Vendor Network Security Compliance Auditor, fully offline.
#   ./run.sh            build UI + start server on :8099
#   ./run.sh --reset    also wipe learned vendors + audit history (fresh demo)
#   ./run.sh --no-build  skip the frontend build (serve the existing dist)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"; FRONTEND="$ROOT/frontend"
PORT="${PORT:-8099}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
PY="$BACKEND/.venv/bin/python"
ARGS=" $* "

# 1. backend venv
if [ ! -x "$PY" ]; then
  echo "-> creating backend venv…"
  python3 -m venv "$BACKEND/.venv"
  "$BACKEND/.venv/bin/pip" install -q --upgrade pip
  "$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"
fi

# 2. frontend build
if [[ "$ARGS" != *" --no-build "* ]] && command -v npm >/dev/null 2>&1; then
  [ -d "$FRONTEND/node_modules" ] || (cd "$FRONTEND" && npm install)
  echo "-> building frontend…"
  (cd "$FRONTEND" && npm run build)
fi

# 3. optional reset
if [[ "$ARGS" == *" --reset "* ]]; then rm -f "$BACKEND/data/auditor.db"; echo "-> reset learned vendors + history"; fi

# 4. ollama sanity (non-fatal: the app falls back to an offline heuristic).
# Query the Ollama HTTP API directly -- same thing the app does at runtime.
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
if curl -sf "$OLLAMA_URL/api/tags" 2>/dev/null | grep -q "${OLLAMA_MODEL%%:*}"; then
  echo "OK  local model '$OLLAMA_MODEL' reachable at $OLLAMA_URL"
else
  echo "!!  model '$OLLAMA_MODEL' not reachable — unknown-vendor learning uses the offline heuristic"
fi

echo "-> http://127.0.0.1:$PORT"
exec "$PY" -m uvicorn app.main:app --app-dir "$BACKEND" --host 127.0.0.1 --port "$PORT"
