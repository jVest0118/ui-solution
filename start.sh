#!/bin/bash
set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"
LOG_BE="$BASE_DIR/backend.log"
LOG_FE="$BASE_DIR/frontend.log"
PID_FILE="$BASE_DIR/.server.pids"

echo "============================================"
echo " UI Solution Platform - START"
echo "============================================"

# ── Backend build ────────────────────────────
echo "[1/3] Building backend..."
cd "$BACKEND_DIR"
mvn clean package -DskipTests -q
echo "      Build OK"

# ── Backend start ────────────────────────────
echo "[2/3] Starting backend  (port 8080)..."
nohup java -jar "$BACKEND_DIR/target/platform-1.0.0.jar" \
  > "$LOG_BE" 2>&1 &
BACKEND_PID=$!
echo "backend=$BACKEND_PID" > "$PID_FILE"
echo "      PID: $BACKEND_PID"

# Flyway + Spring context 로딩 대기
echo "      Waiting 18s for Spring to start..."
sleep 18

# ── Frontend start ───────────────────────────
echo "[3/3] Starting frontend (port 3000)..."
cd "$FRONTEND_DIR"
nohup npm run dev > "$LOG_FE" 2>&1 &
FRONTEND_PID=$!
echo "frontend=$FRONTEND_PID" >> "$PID_FILE"
echo "      PID: $FRONTEND_PID"

echo ""
echo "============================================"
echo " Backend  : http://localhost:8080/api"
echo " Frontend : http://localhost:3000"
echo " Log (BE) : $LOG_BE"
echo " Log (FE) : $LOG_FE"
echo " PID file : $PID_FILE"
echo "============================================"
