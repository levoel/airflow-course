# Lab: Celery Prefetch Pitfall

Демо classic ловушки CeleryExecutor — `worker_prefetch_multiplier=4` приводит к starvation: long-running task занимает несколько slots в очереди worker-а, блокируя короткие tasks даже когда другие workers свободны.

## Что демонстрирует

- Механика `worker_prefetch_multiplier` в Celery
- Head-of-line blocking: один long task «забивает» prefetched queue
- Разница между «prefetched» и «running» tasks
- Fix: `worker_prefetch_multiplier=1` для unfair-but-correct scheduling
- Inspection через Flower и Redis directly

## Setup

```bash
cd labs/celery-prefetch-pitfall
docker compose up airflow-init
docker compose up -d
```

Поднимаются:

- 1 PostgreSQL (metadata DB)
- 1 Redis (Celery broker + result backend)
- 1 Webserver (UI на :8080)
- 1 Scheduler
- 2 Celery Workers с **concurrency=2** (всего 4 slots в системе)
- 1 Flower (Celery monitoring на :5555)

По умолчанию запускается с `AIRFLOW__CELERY__WORKER_PREFETCH_MULTIPLIER=4` — каждый worker prefetch-ит 4 × 2 = 8 task messages в локальную queue.

## Step 1: Запустить long-running DAG

В webserver UI или CLI:

```bash
docker compose exec webserver airflow dags trigger long_running_dag
```

DAG: 1 task, `sleep 600` (10 минут). Один из workers поднимет её и держит slot.

## Step 2: Запустить short tasks DAG

```bash
docker compose exec webserver airflow dags trigger short_tasks_dag
```

DAG: 20 tasks по `sleep 30`. Логично ожидать — 3 свободных slots (4 − 1 long) выполняют их батчами по 3.

## Step 3: Наблюдать starvation

Откройте Flower на http://localhost:5555 → вкладка Workers.

Видим:

- `worker-1`: 1 active task (long-running), **7 reserved tasks** (prefetched short tasks)
- `worker-2`: 2 active short tasks, 6 reserved

worker-1 «забронировал» 8 короткаих tasks, но обрабатывает только одну активную — long task держит concurrency slot, а prefetched short tasks ждут в локальной queue worker-а **даже несмотря на то, что worker-2 свободен**.

Inspect напрямую в Redis:

```bash
docker compose exec redis redis-cli -n 0 LLEN celery
docker compose exec redis redis-cli -n 0 LRANGE celery 0 -1
```

Длина основной queue упадёт быстро (prefetch выгребает), но в `unacked` хранятся reserved tasks per worker.

Через airflow CLI:

```bash
docker compose exec webserver airflow celery inspect active
docker compose exec webserver airflow celery inspect reserved
```

## Step 4: Измерить throughput

Сколько short tasks завершилось за 5 минут?

```bash
docker compose exec postgres psql -U airflow -d airflow -c "
SELECT
    dag_id,
    state,
    count(*),
    min(start_date) AS first_start,
    max(end_date) AS last_end
FROM task_instance
WHERE dag_id IN ('short_tasks_dag', 'long_running_dag')
GROUP BY dag_id, state
ORDER BY dag_id, state;
"
```

Ожидается: throughput значительно ниже теоретического (3 slots × 2 task/min = 6 tasks/min). Многие short tasks ждут в queue worker-а с long task.

## Step 5: Fix — prefetch_multiplier=1

Stop, измените переменную, restart workers:

```bash
docker compose down
PREFETCH_MULTIPLIER=1 docker compose up -d
```

Repeat steps 1-4. Теперь:

- worker-1 prefetch-ит только `1 × 2 = 2` tasks
- Long task держит 1 active, 1 reserved
- Short tasks естественно балансируются между workers — нет starvation

Throughput coal coal short tasks становится близок к теоретическому.

## Inspect SQL queries

```sql
-- Active TI per worker (executor reports hostname)
SELECT hostname, count(*)
FROM task_instance
WHERE state = 'running'
GROUP BY hostname;

-- Queued vs running
SELECT state, count(*) FROM task_instance
WHERE dag_id IN ('short_tasks_dag', 'long_running_dag')
GROUP BY state;

-- Slot usage по pool
SELECT pool, sum(slots) AS occupied
FROM task_instance
WHERE state IN ('running', 'queued')
GROUP BY pool;
```

## Expected учебные observations

1. С `prefetch_multiplier=4` — short tasks ждут на «забитом» worker-1 даже когда worker-2 свободен.
2. Длительность short_tasks_dag сильно варьируется (от 30s до 10min).
3. С `prefetch_multiplier=1` — fair scheduling, ни один worker не «копит» tasks.
4. Trade-off: prefetch=1 даёт меньший throughput на коротких homogeneous workloads (network round-trips), но избегает head-of-line blocking на heterogeneous.

## Cleanup

```bash
docker compose down -v
```

## Связано с

- **Module 05 Lesson 03** — CeleryExecutor и prefetch internals
- **Module 09** — Production tuning Celery workers
- Sentry post-mortem 2019 о prefetch starvation
