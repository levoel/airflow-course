"""ETL DAG для OpenLineage demo.

Извлекает users и orders из raw.*, агрегирует, кладёт в analytics.user_orders_summary.
PostgresOperator-ы автоматически emit-ят lineage events с SQL facets.
PythonOperator использует inlets/outlets для явной декларации lineage.
"""

from datetime import datetime
from airflow.decorators import dag, task
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.lineage.entities import Table


SOURCE_USERS = Table(database="etl", cluster="source-db", name="raw.users")
SOURCE_ORDERS = Table(database="etl", cluster="source-db", name="raw.orders")
TARGET_SUMMARY = Table(database="etl", cluster="source-db", name="analytics.user_orders_summary")


@dag(
    dag_id="etl_user_orders",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["lab", "openlineage", "etl"],
    default_args={"owner": "lab", "retries": 0},
)
def etl_user_orders():
    extract_users = PostgresOperator(
        task_id="extract_users",
        postgres_conn_id="source_db",
        sql="""
            CREATE TEMP TABLE staging_users AS
            SELECT id, email, country, created_at
            FROM raw.users
            WHERE created_at >= now() - interval '90 days';
        """,
    )

    extract_orders = PostgresOperator(
        task_id="extract_orders",
        postgres_conn_id="source_db",
        sql="""
            CREATE TEMP TABLE staging_orders AS
            SELECT id, user_id, amount, status
            FROM raw.orders
            WHERE status = 'paid';
        """,
    )

    @task(inlets=[SOURCE_USERS, SOURCE_ORDERS], outlets=[TARGET_SUMMARY])
    def transform_and_load():
        import psycopg2
        conn = psycopg2.connect("host=source-db user=etl password=etl dbname=etl")
        cur = conn.cursor()
        cur.execute("TRUNCATE analytics.user_orders_summary;")
        cur.execute("""
            INSERT INTO analytics.user_orders_summary (user_id, email, total_orders, total_amount, updated_at)
            SELECT
                u.id            AS user_id,
                u.email         AS email,
                COUNT(o.id)     AS total_orders,
                SUM(o.amount)   AS total_amount,
                now()           AS updated_at
            FROM raw.users u
            LEFT JOIN raw.orders o ON o.user_id = u.id AND o.status = 'paid'
            GROUP BY u.id, u.email;
        """)
        conn.commit()
        cur.close()
        conn.close()

    [extract_users, extract_orders] >> transform_and_load()


etl_user_orders()
