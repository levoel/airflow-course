-- Source data для ETL DAG. Запустить через psql -U etl -d etl -f /init/sample-data.sql
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;

DROP TABLE IF EXISTS raw.users CASCADE;
CREATE TABLE raw.users (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    country     TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS raw.orders CASCADE;
CREATE TABLE raw.orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES raw.users(id),
    amount      NUMERIC(10, 2) NOT NULL,
    status      TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS analytics.user_orders_summary CASCADE;
CREATE TABLE analytics.user_orders_summary (
    user_id       BIGINT PRIMARY KEY,
    email         TEXT NOT NULL,
    total_orders  INT NOT NULL,
    total_amount  NUMERIC(12, 2) NOT NULL,
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO raw.users (email, country)
SELECT
    'user_' || gs || '@example.com',
    (ARRAY['US', 'DE', 'JP', 'BR', 'IN'])[1 + (gs % 5)]
FROM generate_series(1, 1000) gs;

INSERT INTO raw.orders (user_id, amount, status)
SELECT
    1 + (gs % 1000),
    (random() * 500)::numeric(10, 2),
    (ARRAY['paid', 'pending', 'refunded'])[1 + (gs % 3)]
FROM generate_series(1, 5000) gs;
