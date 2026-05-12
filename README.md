# Apache Airflow 3 Ultimate Course

Ультимативный курс по Apache Airflow с фокусом на 3.x — от scheduler internals до Task SDK, DAG Versioning, OpenLineage и production HA setup.

## Целевая аудитория

- Data engineers, понимающие основы Python и SQL
- Инженеры, переходящие с 2.x на 3.x
- Архитекторы дата-платформ, проектирующие orchestration layer

## Что внутри

**19 модулей** (~55-65 часов):

| # | Модуль | Глубина |
|---|---|---|
| 00 | Введение | Landscape, when NOT Airflow |
| 01 | Архитектура 3.x | Task SDK boundary, DAG Bundles |
| 02 | DAG fundamentals | TaskFlow, Custom Timetables, Setup/Teardown |
| 03 | Operators & Sensors | poke/reschedule/deferred сравнение |
| 04 | **Scheduler internals** ★ | Critical Section, HA через PG row-level locking |
| 05 | **Executors deep** ★ | Pluggable Executors, Edge Executor |
| 06 | XCom & data passing | Custom backends, Object Storage |
| 07 | Dynamic Task Mapping | expand, scaling pitfalls |
| 08 | **Datasets → Assets** ★ | Asset Partitions, Event-driven AIP-82 |
| 09 | Triggerer & Deferrable | asyncio internals |
| 10 | Connections & Secrets | Fernet, Vault, Secrets Backends |
| 11 | Pools & Concurrency | 5 уровней concurrency |
| 12 | Plugins & Listeners | Listener API, React UI plugins |
| 13 | REST API v2 & CLI | FastAPI, airflowctl |
| 14 | **Observability + OpenLineage** ★ | OTel, automatic lineage |
| 15 | Production deployment | HA, Helm, Multi-Team |
| 16 | Testing DAGs | airflow dags test |
| 17 | Design Patterns | Idempotency, HITL, factory |
| 18 | Capstone + Migration 2→3 | E2E project + upgrade playbook |

★ = killer differentiator

## Технологии

- Python 3.12
- Apache Airflow 3.2.x (3.x-first, 2.x как historical context)
- Docker Compose для labs
- PostgreSQL 16
- Redis (CeleryExecutor) и Kubernetes (KubernetesExecutor)

## Структура репозитория

```
airflow-course/
├── config.json              # Манифест курса
├── README.md
├── VERSIONS.md              # Хронология версий Airflow
├── data/
│   ├── glossary.json        # Глоссарий терминов
│   └── troubleshooting.json # Production gotchas
├── src/
│   ├── components/diagrams/ # Custom React диаграммы по модулям
│   └── content/
│       ├── course/          # MDX уроки (модуль/урок)
│       └── quizzes/         # JSON квизы (модуль/урок)
└── labs/                    # Docker labs
    ├── ha-scheduler-race/
    ├── celery-prefetch-pitfall/
    └── ...
```

## Автор

Lev Neganov — neganovlevs@gmail.com

## Лицензия

MIT — материалы открыты, используйте в обучении и production.
