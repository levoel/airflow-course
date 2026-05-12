"""Пример custom OpenLineage extractor.

Демонстрирует как написать extractor для оператора который Airflow native не понимает.
Здесь — CustomApiOperator который читает из HTTP API и пишет в файл.
"""

from datetime import datetime
from airflow.decorators import dag
from airflow.models import BaseOperator

try:
    from openlineage.airflow.extractors import BaseExtractor, TaskMetadata
    from openlineage.client.run import Dataset
    HAS_OL = True
except ImportError:
    HAS_OL = False


class CustomApiOperator(BaseOperator):
    """Минимальный custom оператор: качает данные с HTTP endpoint в файл."""

    def __init__(self, endpoint: str, output_path: str, **kwargs):
        super().__init__(**kwargs)
        self.endpoint = endpoint
        self.output_path = output_path

    def execute(self, context):
        import urllib.request
        urllib.request.urlretrieve(self.endpoint, self.output_path)
        return self.output_path


if HAS_OL:
    class CustomApiExtractor(BaseExtractor):
        """OpenLineage extractor для CustomApiOperator.

        Регистрируется через env var:
            AIRFLOW__OPENLINEAGE__EXTRACTORS=custom_extractor_example.CustomApiExtractor
        """

        @classmethod
        def get_operator_classnames(cls):
            return ["CustomApiOperator"]

        def extract(self) -> "TaskMetadata":
            return TaskMetadata(
                name=f"{self.operator.dag_id}.{self.operator.task_id}",
                inputs=[
                    Dataset(
                        namespace="external-api",
                        name=self.operator.endpoint,
                    )
                ],
                outputs=[
                    Dataset(
                        namespace="local-fs",
                        name=self.operator.output_path,
                    )
                ],
            )


@dag(
    dag_id="custom_extractor_dag",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["lab", "openlineage", "custom-extractor"],
)
def custom_extractor_dag():
    CustomApiOperator(
        task_id="download_users",
        endpoint="https://jsonplaceholder.typicode.com/users",
        output_path="/tmp/users.json",
    )


custom_extractor_dag()
