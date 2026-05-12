# Slim Airflow image для cold start measurement.
# Цель — минимальный image size без bash/curl/apt cache для быстрого pull и быстрого container start.
#
# Размер: ~300MB vs ~1.2GB у стандартного apache/airflow image.
FROM python:3.11-slim AS base

ENV AIRFLOW_HOME=/opt/airflow \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Минимальные runtime deps. Никакого build-essential или dev headers — это runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Airflow ставим pinned версией БЕЗ optional providers.
ARG AIRFLOW_VERSION=2.10.5
ARG PYTHON_VERSION=3.11
RUN pip install --no-cache-dir \
    "apache-airflow[celery,postgres,redis,cncf.kubernetes]==${AIRFLOW_VERSION}" \
    --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"

RUN useradd -ms /bin/sh airflow \
    && mkdir -p "$AIRFLOW_HOME/dags" "$AIRFLOW_HOME/logs" \
    && chown -R airflow:airflow "$AIRFLOW_HOME"

USER airflow
WORKDIR $AIRFLOW_HOME

ENTRYPOINT ["airflow"]
