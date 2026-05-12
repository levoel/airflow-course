"""Short tasks DAG для prefetch pitfall lab.

20 параллельных задач sleep 30s. С prefetch_multiplier=4 они будут
prefetched одним worker-ом и блокированы long task на том же worker.
"""

from datetime import datetime
from airflow.decorators import dag, task


@dag(
    dag_id="short_tasks_dag",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    max_active_tasks=32,
    tags=["lab", "celery-prefetch-pitfall", "short"],
    default_args={"owner": "lab", "retries": 0},
)
def short_tasks_dag():
    @task
    def short_task(i: int):
        import time
        time.sleep(30)
        return f"short_task_{i} done"

    short_task.expand(i=list(range(1, 21)))


short_tasks_dag()
