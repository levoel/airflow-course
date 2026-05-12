# Lab: Kubernetes Executor Cold Start Measurement

Замерить и сравнить total wall-clock time выполнения 100 коротких tasks на CeleryExecutor (warm workers) vs KubernetesExecutor (pod-per-task, cold start). Увидеть собственными глазами 10-30x разницу и поэкспериментировать с mitigation strategies.

## Что демонстрирует

- Pod-per-task model KubernetesExecutor: каждая task = новый pod
- Cold start стоимость: image pull + container start + Python interpreter boot + DAG parse
- Warm reuse model CeleryExecutor: long-living workers
- Mitigation: image pre-pull, slim images, `imagePullPolicy: IfNotPresent`
- Когда K8sExecutor выигрывает (heterogeneous resource requirements) и когда проигрывает (short uniform tasks)

## Setup

Этот lab использует **KIND** (Kubernetes in Docker) для воспроизводимости. Подразумевается что у вас установлен `kind` и `kubectl`. Если нет:

```bash
brew install kind kubectl helm  # macOS
```

```bash
cd labs/kubernetes-cold-start-measurement
./scripts/setup-kind.sh
```

Скрипт:

1. Создаёт `kind` кластер `airflow-lab` с 1 control plane + 2 workers
2. Поднимает Postgres и Redis через docker compose (вне K8s, для скорости)
3. Деплоит Airflow Helm chart в namespace `airflow` с двумя executor-ами

## Step 1: Run на CeleryExecutor (warm)

Активировать Celery деплоймент:

```bash
helm upgrade airflow apache-airflow/airflow \
    --namespace airflow \
    --set executor=CeleryExecutor \
    --set workers.replicas=2 \
    -f helm/values-celery.yaml
```

Подождать пока pods `airflow-worker-*` будут `Running`. Триггернуть DAG:

```bash
kubectl exec -n airflow deploy/airflow-scheduler -- \
    airflow dags trigger hundred_short_tasks
```

Измерить total time:

```bash
kubectl exec -n airflow deploy/airflow-scheduler -- \
    airflow dags list-runs -d hundred_short_tasks --state success
```

Запишите duration. Ожидаемо: ~2-3 минуты для 100 tasks по 5s на 2 workers concurrency=4 (8 slots) — теоретически 100/8 × 5s ≈ 62s, плюс scheduler latency.

## Step 2: Run на KubernetesExecutor (cold)

Переключиться:

```bash
helm upgrade airflow apache-airflow/airflow \
    --namespace airflow \
    --set executor=KubernetesExecutor \
    -f helm/values-k8s.yaml
```

Триггернуть тот же DAG:

```bash
kubectl exec -n airflow deploy/airflow-scheduler -- \
    airflow dags trigger hundred_short_tasks
```

В отдельном терминале наблюдать pod-per-task:

```bash
kubectl get pods -n airflow -w | grep hundredshorttasks
```

Видим: pod создаётся → `ContainerCreating` (image pull) → `Running` (Python boot) → `Completed`. Каждый pod живёт ~15-30 секунд для выполнения 5-секундной task.

Измерить total time:

```bash
kubectl exec -n airflow deploy/airflow-scheduler -- \
    airflow dags list-runs -d hundred_short_tasks --state success
```

## Step 3: Pre-pull image mitigation

Pre-pull worker image на все nodes ДО запуска:

```bash
kubectl apply -f manifests/image-prepull-daemonset.yaml
kubectl wait --for=condition=ready pod -l app=image-prepull -n airflow --timeout=120s
```

Это DaemonSet с `command: ["sleep", "infinity"]` который тянет образ на каждый node. Теперь pod startup не требует image pull (`imagePullPolicy: IfNotPresent`).

Repeat Step 2. Ожидаемо: 30-50% улучшение cold start (image pull обычно доминирует).

## Step 4: Slim image mitigation

Build кастомный slim image (`python:3.11-slim` без bash, без apt cache):

```bash
docker build -t airflow-slim:lab labs/kubernetes-cold-start-measurement/slim-image/
kind load docker-image airflow-slim:lab --name airflow-lab

helm upgrade airflow apache-airflow/airflow \
    --namespace airflow \
    -f helm/values-k8s-slim.yaml
```

Repeat Step 2. Дополнительные секунды отыграны на меньшем image size (300MB vs 1.2GB).

## Comparison table

Заполняйте по результатам своих измерений:

| Configuration | Total time | Per-task overhead | Notes |
|---|---|---|---|
| CeleryExecutor warm | ~70s | ~0s | baseline |
| KubernetesExecutor (cold, no pre-pull) | ~12-15min | ~7-9s | image pull dominates |
| K8sExecutor + image pre-pull | ~6-8min | ~3-5s | container start + Python boot |
| K8sExecutor + slim image | ~5-6min | ~2-3s | smaller layers, faster scan |
| K8sExecutor + pre-pull + slim | ~4-5min | ~2s | best K8s, still 4x worse than Celery |

## Что в логах смотреть

```bash
# Сколько времени pod был в ContainerCreating
kubectl get events -n airflow --sort-by='.lastTimestamp' | grep -E "(Pulling|Pulled|Created|Started)"

# Detailed pod lifecycle
kubectl describe pod -n airflow hundredshorttasks-<task_id>-<random>
```

В Airflow scheduler logs:

```bash
kubectl logs -n airflow deploy/airflow-scheduler -c scheduler | \
    grep -E "(launching|pod_launcher|adopted)"
```

## Когда K8sExecutor оправдан

Не показано в этом lab, но обсуждается в курсе:

- **Heterogeneous resources**: одна task требует 16GB RAM, другая 256MB. Celery worker должен быть размером с самую жирную task → wasted resources. K8s pod-per-task масштабирует точно.
- **GPU / специфичные nodeSelectors**: pod с GPU только для ML tasks.
- **Strong isolation**: container per task, нет shared Python interpreter state.
- **Bursty workload**: автомасштабирование через Cluster Autoscaler с node pool 0→N.

## Cleanup

```bash
./scripts/teardown-kind.sh
```

Удалит кластер и docker compose volumes.

## Связано с

- **Module 05 Lesson 04** — KubernetesExecutor architecture
- **Module 05 Lesson 05** — Cold start tuning
- **Module 14** — Production K8s deployment
