# Lab: OpenLineage to Marquez

Auto-emission lineage events из Airflow в Marquez backend. Видим граф потока данных через ETL DAG: Postgres source → transform → Postgres sink, с автоматически собранными датасетами, фасеты schema и SQL parser facets.

## Что демонстрирует

- OpenLineage provider `apache-airflow-providers-openlineage` в Airflow 2.10+
- Автоматическая emission lineage events с минимальной настройкой
- Marquez как reference backend (REST API + UI на :3000)
- Auto-extracted lineage из PostgresOperator (SQL parsed, columns extracted)
- Manual lineage via inlets/outlets для custom Python operators
- Job hierarchy: DAG run → task → operator-level
- Visual lineage graph с facet `schema`, `sql`, `dataQualityMetrics`

## Setup

```bash
cd labs/openlineage-marquez
docker compose up airflow-init
docker compose up -d
```

Поднимаются:

- 1 PostgreSQL (Airflow metadata DB)
- 1 Marquez Postgres (отдельный, для lineage events)
- 1 Marquez API (порт 5000)
- 1 Marquez Web UI (порт 3000)
- 1 Airflow Webserver (порт 8080)
- 1 Scheduler с OpenLineage listener
- 1 LocalExecutor worker
- 1 Source/Sink Postgres (`source-db` на 5433) — где живут данные ETL

OpenLineage конфигурируется через env vars в `airflow-common`:

```yaml
AIRFLOW__OPENLINEAGE__TRANSPORT: '{"type": "http", "url": "http://marquez:5000"}'
AIRFLOW__OPENLINEAGE__NAMESPACE: "airflow-lab"
```

## Step 1: Initialize source data

```bash
docker compose exec source-db psql -U etl -d etl -f /init/sample-data.sql
```

Создаёт три таблицы:

- `raw.users` (1000 rows)
- `raw.orders` (5000 rows)
- `analytics.user_orders_summary` (target, пустая)

## Step 2: Trigger ETL DAG

```bash
docker compose exec webserver airflow dags trigger etl_user_orders
```

DAG (`etl_user_orders.py`) выполняет:

1. `extract_users` (PostgresOperator) — `SELECT FROM raw.users`
2. `extract_orders` (PostgresOperator) — `SELECT FROM raw.orders`
3. `transform` (PythonOperator с inlets/outlets) — join + aggregate
4. `load_summary` (SQLExecuteQueryOperator) — `INSERT INTO analytics.user_orders_summary`

## Step 3: Observe в Marquez UI

```bash
open http://localhost:3000
```

В UI:

- Namespace selector → `airflow-lab`
- Datasets tab → видим `source-db.raw.users`, `source-db.raw.orders`, `source-db.analytics.user_orders_summary`
- Jobs tab → `etl_user_orders.extract_users`, `etl_user_orders.transform`, `etl_user_orders.load_summary`
- Кликаем на dataset → видим граф зависимостей с upstream/downstream jobs
- Кликаем на job run → видим SQL facet, schema facet, runtime metadata

## Step 4: Inspect raw events

Marquez REST API:

```bash
# List namespaces
curl -s http://localhost:5000/api/v1/namespaces | jq .

# List jobs в namespace
curl -s http://localhost:5000/api/v1/namespaces/airflow-lab/jobs | jq '.jobs[].name'

# Дёрнуть один job
curl -s http://localhost:5000/api/v1/namespaces/airflow-lab/jobs/etl_user_orders.transform | jq .

# Все runs
curl -s "http://localhost:5000/api/v1/namespaces/airflow-lab/jobs/etl_user_orders.transform/runs" | jq .

# Facets dataset
curl -s http://localhost:5000/api/v1/namespaces/airflow-lab/datasets/source-db.analytics.user_orders_summary | jq .
```

В таблице metadata Marquez Postgres все events:

```bash
docker compose exec marquez-db psql -U marquez -d marquez -c "
SELECT job_name, run_id, transitioned_at, state
FROM lineage_events
ORDER BY transitioned_at DESC LIMIT 20;
"
```

## Step 5: Custom extractor example

Файл `dags/custom_extractor_example.py` показывает как написать кастомный extractor для оператора который Airflow native не понимает (custom HTTP operator).

```python
from openlineage.airflow.extractors import BaseExtractor

class CustomHttpExtractor(BaseExtractor):
    @classmethod
    def get_operator_classnames(cls):
        return ["CustomApiOperator"]

    def extract(self) -> TaskMetadata:
        return TaskMetadata(
            name=self.operator.task_id,
            inputs=[Dataset(namespace="external-api", name=self.operator.endpoint)],
            outputs=[Dataset(namespace="local-fs", name=self.operator.output_path)],
        )
```

Регистрация через env var:

```yaml
AIRFLOW__OPENLINEAGE__EXTRACTORS: "dags.custom_extractor_example.CustomHttpExtractor"
```

Триггерим:

```bash
docker compose exec webserver airflow dags trigger custom_extractor_dag
```

В Marquez появляется dataset `external-api.https://api.example.com/users`.

## Step 6: Column-level lineage

Для SQL queries OpenLineage SQL parser извлекает column-level lineage automatically.

В Marquez UI dataset `analytics.user_orders_summary` → tab Columns → видим mapping:

```
user_id        ← raw.users.id
email          ← raw.users.email
total_orders   ← COUNT(raw.orders.id)
total_amount   ← SUM(raw.orders.amount)
```

Это zero-config — работает потому что SQLExecuteQueryOperator передаёт SQL в `extract` callback и `openlineage-sql` парсит AST.

## Что узнать в logs

```bash
# Listener emission events
docker compose logs scheduler | grep -i openlineage

# Marquez API received events
docker compose logs marquez-api | grep -i "received event"

# Errors (если есть)
docker compose logs scheduler | grep -i "openlineage.*error"
```

## Cleanup

```bash
docker compose down -v
```

## Expected учебные observations

1. PostgresOperator emit-ит lineage без явных inlets/outlets — SQL parsed автоматически.
2. PythonOperator требует manual inlets/outlets либо custom extractor.
3. Marquez сохраняет full history runs, можно ходить в прошлое.
4. Facets — расширяемая модель: schema, sql, dataQualityMetrics, sourceCodeLocation.
5. Lineage graph агрегирует все DAG runs в единую картину потока данных.

## Связано с

- **Module 11 Lesson 02** — OpenLineage architecture и spec
- **Module 11 Lesson 03** — Custom extractors и facets
- **Module 13** — Data governance integrations (DataHub, Marquez, Atlan)
