# Хронология Apache Airflow

## Major релизы

| Версия | Дата | Killer features |
|---|---|---|
| **1.x** | 2014-2020 | Прототип Airbnb → Apache top-level (2019) |
| **2.0** | 2020-12-17 | HA Scheduler (multi-instance), TaskFlow API, REST API stable, full DAG serialization |
| **2.2** | 2021-10-11 | Custom Timetables (AIP-39), deferrable operators (AIP-40) experimental |
| **2.3** | 2022-04-30 | Dynamic Task Mapping (AIP-42), Grid View, LocalKubernetesExecutor |
| **2.4** | 2022-09-19 | Datasets / Data-aware scheduling (AIP-48), ExternalPython operator |
| **2.5** | 2022-12-02 | Reschedule Sensor improvements, Connection testing |
| **2.6** | 2023-04-30 | Notifier abstraction, OpenLineage provider стабилизирован |
| **2.7** | 2023-08-18 | Setup/Teardown tasks, cluster activity dashboard |
| **2.8** | 2023-12-15 | Object Storage API (fsspec), listener hooks для dataset events |
| **2.9** | 2024-04-08 | DatasetAlias, dataset-driven events, custom names для DynamicTaskMapping |
| **2.10** | 2024-08-15 | Multiple Executors одновременно (AIP-61), OpenTelemetry tracing |
| **2.11** | 2025-05-20 | LTS, DeltaTriggerTimetable, migration helpers для 3.x |
| **3.0** | 2025-04-22 | Task SDK (AIP-72), DAG versioning, Edge Executor, React UI, REST API v2, Datasets→Assets |
| **3.1** | 2025-09-25 | HITL (human-in-the-loop), Task SDK decoupled, Deadline Alerts, UI i18n |
| **3.2** | 2026-04-07 | Asset partitioning, Multi-Team Deployments (AIP-67), structured JSON logs, async PythonOperator |

## Текущий target курса

**Airflow 3.2.x** — current stable. 2.10/2.11 как historical context (80% production deployments).

## Активные AIPs (2026)

| AIP | Что | Статус |
|---|---|---|
| AIP-63 | DAG Versioning | shipped в 3.0 |
| AIP-66 | DAG Bundles & Parsing | shipped в 3.0 |
| AIP-67 | Multi-team deployment | experimental в 3.2 |
| AIP-69 | Edge Executor | shipped в 3.0 |
| AIP-72 | Task SDK | shipped в 3.0 |
| AIP-73/74/75 | Assets model | 3.0 |
| AIP-78 | Scheduler-managed backfill | 3.0 |
| AIP-82 | Event-driven scheduling | 3.0 |
