#!/usr/bin/env bash
set -e

# Ensure we run from the project root
cd "$(dirname "$0")"

# Graceful cleanup: terminate both background processes when Ctrl+C is pressed
cleanup() {
  echo ""
  echo "Shutting down Scotland Yard services..."
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo "All services stopped."
}
trap cleanup EXIT INT TERM

echo "===================================================="
echo "  🕵️‍♂️ Digital Scotland Yard - Starting Services"
echo "===================================================="
echo "  Multiplayer Server : http://0.0.0.0:3001"
echo "  Web Client         : http://127.0.0.1:3000"
echo "  Press Ctrl+C at any time to stop both services."
echo "===================================================="
echo ""

# 1. Start real-time multiplayer WebSocket server (port 3001)
npm run dev:server &

# 2. Start Next.js production web client (port 3000)
BASE_PATH="${BASE_PATH:-}" npm run start --workspace=packages/client &

# Keep script in foreground and wait for child processes
wait
