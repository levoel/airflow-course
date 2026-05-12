#!/usr/bin/env bash
set -euo pipefail
CLUSTER_NAME="${CLUSTER_NAME:-airflow-lab}"

echo "[1/2] Удаление KIND кластера $CLUSTER_NAME..."
kind delete cluster --name "$CLUSTER_NAME"

echo "[2/2] Остановка docker compose..."
docker compose down -v

echo "Готово."
