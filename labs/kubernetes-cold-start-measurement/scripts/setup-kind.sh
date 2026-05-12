#!/usr/bin/env bash
# Создаёт KIND кластер airflow-lab + поднимает Postgres/Redis через docker compose.
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-airflow-lab}"

echo "[1/5] Создание KIND кластера $CLUSTER_NAME..."
kind create cluster --name "$CLUSTER_NAME" --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
EOF

echo "[2/5] Запуск Postgres/Redis через docker compose..."
docker compose up -d

echo "[3/5] Создание namespace airflow..."
kubectl create namespace airflow

echo "[4/5] Установка Helm chart Airflow..."
helm repo add apache-airflow https://airflow.apache.org
helm repo update
helm install airflow apache-airflow/airflow \
    --namespace airflow \
    --version 1.15.0 \
    --set executor=CeleryExecutor \
    --set data.metadataConnection.host=host.docker.internal \
    --set data.metadataConnection.user=airflow \
    --set data.metadataConnection.pass=airflow \
    --set data.metadataConnection.db=airflow \
    --set redis.enabled=false \
    --set redis.host=host.docker.internal \
    --set workers.replicas=2 \
    --set workers.persistence.enabled=false \
    --set postgresql.enabled=false \
    --wait --timeout=10m

echo "[5/5] Копирование DAGs в airflow scheduler pod..."
kubectl cp dags/hundred_short_tasks.py \
    airflow/$(kubectl get pod -n airflow -l component=scheduler -o jsonpath='{.items[0].metadata.name}'):/opt/airflow/dags/

echo "Готово. Airflow UI:"
echo "  kubectl port-forward -n airflow svc/airflow-webserver 8080:8080"
echo "  open http://localhost:8080  (admin/admin)"
