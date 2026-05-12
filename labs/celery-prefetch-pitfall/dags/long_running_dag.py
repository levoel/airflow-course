"""Long-running DAG для prefetch pitfall lab.

Одна задача sleep 600s. Цель: занять один concurrency slot worker-а
надолго, чтобы наблюдать head-of-line blocking prefetched short tasks.
"""

from datetime import datetime
from airflow.decorators import dag, task


@dag(
    dag_id="long_running_dag",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["lab", "celery-prefetch-pitfall", "long"],
    default_args={"owner": "lab", "retries": 0},
)
def long_running_dag():
    @task
    def long_task():
        import time
        time.sleep(600)
        return "long_task done after 10 minutes"

    long_task()


long_running_dag()
