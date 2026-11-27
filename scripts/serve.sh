#!/usr/bin/env bash
# Serve the app locally (service worker + manifest need http, not file://)
# Usage: scripts/serve.sh [port]   then open http://localhost:8765
cd "$(dirname "$0")/../app" && python3 -m http.server "${1:-8765}" --bind 127.0.0.1
