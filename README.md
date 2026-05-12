# Apache Airflow 2 Ultimate Course

Ультимативный курс по Apache Airflow с фокусом на 2.x (2.10/2.11 LTS) — от scheduler internals до Celery/Kubernetes executors, Datasets, Deferrable Operators, OpenLineage и production HA setup.

## Целевая аудитория

- Data engineers, понимающие основы Python и SQL
- Инженеры, работающие с production Airflow 2.x
- Архитекторы дата-платформ, проектирующие orchestration layer

## Что внутри

**19 модулей** (~55-65 часов):

| # | Модуль | Глубина |
|---|---|---|
| 00 | Введение | Landscape, when NOT Airflow |
| 01 | Архитектура 2.x | Webserver, Scheduler, Workers, Triggerer, DAG Processor |
| 02 | DAG fundamentals | TaskFlow, Custom Timetables, Setup/Teardown |
| 03 | Operators & Sensors | poke/reschedule/deferred сравнение |
| 04 | **Scheduler internals** ★ | Critical Section, HA через PG row-level locking |
| 05 | **Executors deep** ★ | Local, Celery, Kubernetes, CeleryKubernetes, Multiple Executors (AIP-61) |
| 06 | XCom & data passing | Custom backends, Object Storage XCom (2.8+) |
| 07 | Dynamic Task Mapping | expand, scaling pitfalls |
| 08 | **Datasets** ★ | Data-aware scheduling (2.4+), DatasetAlias (2.9), event-driven patterns |
| 09 | Triggerer & Deferrable | asyncio internals, AIP-40 |
| 10 | Connections & Secrets | Fernet, Vault, Secrets Backends |
| 11 | Pools & Concurrency | 5 уровней concurrency |
| 12 | Plugins & Listeners | Listener API (2.8+), plugin architecture |
| 13 | REST API & CLI | Stable REST API v1 (2.0+), automation |
| 14 | **Observability + OpenLineage** ★ | OTel (2.10+), automatic lineage |
| 15 | Production deployment | HA, Helm chart, MWAA/Composer/Astronomer |
| 16 | Testing DAGs | airflow dags test, pytest-airflow |
| 17 | Design Patterns | Idempotency, DAG factory, backfill-safety |
| 18 | Capstone + Upgrade Path на 3.x | E2E project + migration к Airflow 3.0+ |

★ = killer differentiator

## Технологии

- **Apache Airflow 2.10.x / 2.11.x (LTS)** — основной target
- Python 3.11
- Docker Compose для labs
- PostgreSQL 16
- Redis (CeleryExecutor) и Kubernetes (KubernetesExecutor)

## Почему Airflow 2, а не 3?

На май 2026 года ~80% production deployments всё ещё на 2.10/2.11. Airflow 2.11 — официальный LTS с поддержкой security patches. Большинство managed services (AWS MWAA, GCP Cloud Composer 2) только начинают поддерживать 3.x.

Курс делает вас экспертом по 2.x — production reality — а в финальном модуле даёт **upgrade path к 3.x**: что меняется (FastAPI server, Task SDK, DAG Versioning, Assets rename), как мигрировать через `airflow upgrade-check`, что сломается.

## Структура репозитория

```
airflow-course/
├── config.json
├── README.md
├── VERSIONS.md
├── data/
│   ├── glossary.json
│   └── troubleshooting.json
├── src/
│   ├── components/diagrams/
│   └── content/
│       ├── course/        # MDX уроки (модуль/урок)
│       └── quizzes/       # JSON квизы
└── labs/                  # Docker labs
    ├── ha-scheduler-race/
    └── ...
```

## Автор

Lev Neganov — neganovlevs@gmail.com

## Лицензия

MIT
