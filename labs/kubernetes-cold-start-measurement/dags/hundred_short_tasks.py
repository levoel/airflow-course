"""100 коротких задач для cold start measurement.

Каждая task sleep 5 секунд. На CeleryExecutor выполняется быстро (warm reuse),
на KubernetesExecutor — каждая задача поднимает свой pod (cold start).
"""

from datetime import datetime
from airflow.decorators import dag, task


@dag(
    dag_id="hundred_short_tasks",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    max_active_tasks=100,
    tags=["lab", "k8s-cold-start"],
    default_args={"owner": "lab", "retries": 0},
)
def hundred_short_tasks():
    @task
    def short_task(i: int):
        import time
        time.sleep(5)
        return f"task_{i} done"

    short_task.expand(i=list(range(1, 101)))


hundred_short_tasks()
