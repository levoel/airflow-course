# Хронология Apache Airflow

## Target курса: Airflow 2.x

Курс ориентирован на **Apache Airflow 2.10.x и 2.11.x (LTS)** — production reality большинства deployments на 2026 год. Airflow 3.x обзорно покрывается в финальном модуле как upgrade path.

## Major релизы 2.x

| Версия | Дата | Killer features |
|---|---|---|
| **2.0** | 2020-12-17 | **HA Scheduler (multi-instance)**, TaskFlow API, REST API stable, full DAG serialization |
| **2.1** | 2021-05-21 | Connection testing, DAG callbacks |
| **2.2** | 2021-10-11 | **Custom Timetables (AIP-39)**, **Deferrable Operators (AIP-40) experimental**, smart-sensors deprecated |
| **2.3** | 2022-04-30 | **Dynamic Task Mapping (AIP-42)**, Grid View, LocalKubernetesExecutor |
| **2.4** | 2022-09-19 | **Datasets / Data-aware scheduling (AIP-48)**, Auto-register dataset events, ExternalPython operator |
| **2.5** | 2022-12-02 | Reschedule Sensor improvements, Connection testing UI, `airflow tasks test` |
| **2.6** | 2023-04-30 | `notifier` abstraction, OpenLineage provider стабилизирован |
| **2.7** | 2023-08-18 | **Setup/Teardown tasks**, cluster activity dashboard, Python 3.11 |
| **2.8** | 2023-12-15 | **Object Storage API** (fsspec-based), **Listener API** для dataset events |
| **2.9** | 2024-04-08 | **DatasetAlias**, dataset-driven events, custom names для DynamicTaskMapping |
| **2.10** | 2024-08-15 | **Multiple Executors одновременно (AIP-61)**, **OpenTelemetry tracing**, `@skip_if`/`@run_if` |
| **2.10.5** | 2025-02-10 | Teardown executed even when DAG failed |
| **2.11** | 2025-05-20 | **LTS**, DeltaTriggerTimetable, drop Python 3.8, migration helpers для 3.x |

## Что нас ждёт в 3.x (обзорно)

**Airflow 3.0** (2025-04-22) принёс major архитектурную перестройку:

| Что | 2.x | 3.x |
|---|---|---|
| Web layer | Flask + FAB | FastAPI + React UI |
| Workers DB access | Direct SQLAlchemy | Только через REST API (Task SDK, AIP-72) |
| DAG Processor | Опциональный | Mandatory (AIP-66) |
| DAG storage | Локальная папка | DAG Bundles (git/S3/GCS) |
| DAG Versioning | Нет | Каждый DagRun на своей версии (AIP-63) |
| Datasets | `Dataset(...)` | **Assets** — `@asset` decorator (AIP-74/75) |
| `execution_date` | Часто используется | Deprecated — `logical_date` |
| REST API | v1 (Flask-RESTful) | v2 (FastAPI с OpenAPI) |
| Edge workers | ❌ | Edge Executor (AIP-69) |

**Финальный модуль курса** покрывает migration playbook 2.x → 3.x через `airflow upgrade-check`, ruff правила AIR301/AIR302, шаги deployment upgrade.

## Stable LTS на 2026

- **Airflow 2.11** — LTS до 2026, поддерживается security patches
- **Airflow 3.2** — current stable

Большинство managed services на 2026 ещё на 2.x:
- **AWS MWAA** — поддерживает 2.10 (3.x roadmap unclear)
- **GCP Cloud Composer 2/3** — 2.x default, 3.x in beta
- **Astronomer Astro** — 2.x и 3.x параллельно

## Активные AIPs (relevant для 2.x)

| AIP | Что | Доступно в |
|---|---|---|
| AIP-39 | Custom Timetables | 2.2+ |
| AIP-40 | Deferrable Operators | 2.2+ (experimental), 2.5+ stable |
| AIP-42 | Dynamic Task Mapping | 2.3+ |
| AIP-48 | Datasets / Data-aware scheduling | 2.4+ |
| AIP-49 | OpenTelemetry Support | 2.10+ |
| AIP-61 | Multiple Executors | 2.10+ |

## Что НЕ покрываем (deprecated в 2.x)

- **Airflow 1.x** — устарел, не используется в новых проектах
- **SubDAG operator** — deprecated, anti-pattern, заменён TaskGroup
- **Smart Sensors** — удалены в 2.x, заменены Deferrable Operators
- **SequentialExecutor** — только для testing
- **Flower как primary monitor** — устарел в пользу OTel метрик
