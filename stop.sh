#!/bin/bash

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$BASE_DIR/.server.pids"

echo "============================================"
echo " UI Solution Platform - STOP"
echo "============================================"

# ── PID 파일로 종료 ──────────────────────────
if [ -f "$PID_FILE" ]; then
    while IFS='=' read -r name pid; do
        [ -z "$pid" ] && continue
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping $name (PID: $pid)..."
            kill "$pid" 2>/dev/null
            # SIGTERM 후 최대 5초 대기
            for i in {1..5}; do
                kill -0 "$pid" 2>/dev/null || break
                sleep 1
            done
            kill -9 "$pid" 2>/dev/null || true
        else
            echo "$name (PID: $pid) already stopped."
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
else
    echo "No PID file found. Killing by port..."
fi

# ── 포트로 잔여 프로세스 정리 ────────────────
for port in 8080 3000; do
    pid=$(lsof -ti tcp:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
    fi
done

echo "Done."
echo "============================================"
