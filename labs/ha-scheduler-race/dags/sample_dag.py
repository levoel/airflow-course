"""Sample DAG для HA Scheduler Race lab.

Запускает 8 tasks параллельно, каждая sleep 30s — генерирует нагрузку
на scheduler critical section для observable race condition.
"""

from datetime import datetime, timedelta
from airflow.sdk import dag, task


@dag(
    dag_id="sample_dag",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=10,
    tags=["lab", "ha-scheduler-race"],
    default_args={
        "owner": "lab",
        "retries": 1,
        "retry_delay": timedelta(seconds=30),
    },
)
def sample_dag():
    @task
    def task_1():
        import time
        time.sleep(30)
        return "task_1 done"

    @task
    def task_2():
        import time
        time.sleep(30)
        return "task_2 done"

    @task
    def task_3():
        import time
        time.sleep(30)
        return "task_3 done"

    @task
    def task_4():
        import time
        time.sleep(30)
        return "task_4 done"

    @task
    def task_5():
        import time
        time.sleep(30)
        return "task_5 done"

    @task
    def task_6():
        import time
        time.sleep(30)
        return "task_6 done"

    @task
    def task_7():
        import time
        time.sleep(30)
        return "task_7 done"

    @task
    def task_8():
        import time
        time.sleep(30)
        return "task_8 done"

    [task_1(), task_2(), task_3(), task_4(),
     task_5(), task_6(), task_7(), task_8()]


sample_dag()
