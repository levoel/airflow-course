# Lab: HA Scheduler Race

Demo two-scheduler HA setup, observe row-level lock contention on `slot_pool` via `pg_locks` in real-time.

## Что демонстрирует

- Multi-scheduler HA через PostgreSQL row-level locks
- Critical section contention в реальном времени
- Behavior `SELECT ... FOR UPDATE NOWAIT` при race condition
- Failover: kill одного scheduler → второй adopt orphan TI

## Setup

```bash
cd labs/ha-scheduler-race
docker compose up airflow-init
docker compose up -d
```

Поднимаются:
- 1 PostgreSQL
- 1 Redis (Celery broker)
- 1 Webserver (Flask)
- **2 Scheduler instances** (scheduler-1, scheduler-2) — каждый с встроенным DagFileProcessor pool
- 2 Celery Workers
- 1 Triggerer

## Step 1: Запустить нагрузку

В отдельном терминале триггеруем 100 DAG runs параллельно:

```bash
docker compose exec webserver bash -c '
  for i in {1..100}; do
    airflow dags trigger sample_dag --run-id manual_$i
  done
'
```

## Step 2: Наблюдать race в `pg_locks`

В отдельном терминале запустить streaming:

```bash
docker compose exec postgres psql -U airflow -d airflow -c "
WATCH 1
SELECT
    pa.pid,
    pa.application_name,
    pa.state AS conn_state,
    pl.mode,
    pl.granted,
    age(now(), pa.query_start) AS query_duration
FROM pg_locks pl
JOIN pg_stat_activity pa ON pl.pid = pa.pid
WHERE pl.relation = 'slot_pool'::regclass
ORDER BY pa.query_start;
"
```

Каждую секунду увидите snapshot: один scheduler с `granted=true, mode='RowExclusiveLock'`, второй не появляется (NOWAIT не блокируется).

## Step 3: Kill one scheduler — failover

```bash
docker compose kill scheduler-1
```

Подождите 30 секунд (scheduler_health_check_threshold). В логах scheduler-2 увидите:

```
INFO - Adopting 5 orphaned task instances from job_id=...
INFO - Resetting 3 orphaned task instances to None
```

Это `adopt_or_reset_orphaned_tasks` в действии.

## Что узнать в logs

```bash
# scheduler-1 logs во время race
docker compose logs --tail=50 scheduler-1 | grep -E "(critical_section|lock|adopt)"

# Postgres logs (если log_lock_waits включён)
docker compose logs postgres | grep "lock"
```

## Cleanup

```bash
docker compose down -v
```

## Expected учебные observations

1. ✅ Только один scheduler одновременно в critical section
2. ✅ Второй scheduler получает lock_not_available и пропускает tick (не блокируется)
3. ✅ Throughput с 2 scheduler ≈ с 1 scheduler (critical section serialized)
4. ✅ После kill одного scheduler — второй забирает работу через adopt
5. ✅ TI у мёртвого scheduler не теряются — adopt or reset to None

## Связано с

- **Module 04 Lesson 02** — Critical Section и HA через PostgreSQL row-level locks
- **Module 15** — Production HA setup
