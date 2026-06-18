#!/bin/bash

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo " UI Solution Platform - RESTART"
echo "============================================"

bash "$BASE_DIR/stop.sh"
echo "Waiting 3s..."
sleep 3
bash "$BASE_DIR/start.sh"
