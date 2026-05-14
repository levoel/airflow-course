/** @jsxImportSource solid-js */
/**
 * DatasetCascade
 *
 * Один producer DAG публикует Dataset event (s3://bucket/raw/orders).
 * Airflow scheduler триггерит N consumer DAG-ов, у которых этот Dataset
 * в `schedule=[...]`. Каждый consumer может публиковать свой Dataset --
 * получается каскад event-driven workflow без cron.
 */

import { DiagramContainer } from '@primitives/DiagramContainer';
import { DiagramTooltip } from '@primitives/Tooltip';

interface Edge {
  from: string;
  to: string;
}

const NODES = {
  producer: {
    id: 'producer',
    title: 'extract_orders',
    type: 'producer' as const,
    tooltip:
      'Producer DAG. По расписанию (cron / interval) читает источник и пишет в S3. На outlets=[Dataset(...)] -- scheduler регистрирует DatasetEvent в DB.',
    detail: 'outlets=[orders_ds]',
  },
  ds1: {
    id: 'ds1',
    title: 's3://lake/raw/orders',
    type: 'dataset' as const,
    tooltip:
      'Dataset URI. Не файл -- именованная "точка обновления". DatasetEvent с producer task_instance пишется в dataset_event таблицу.',
    detail: 'Dataset',
  },
  c1: {
    id: 'c1',
    title: 'transform_orders',
    type: 'consumer' as const,
    tooltip:
      'Consumer #1. schedule=[orders_ds]. Триггерится сразу после прихода event -- DatasetTriggeredTimetable. Может публиковать свой Dataset.',
    detail: 'schedule=[orders_ds], outlets=[clean_ds]',
  },
  c2: {
    id: 'c2',
    title: 'alert_finance',
    type: 'consumer' as const,
    tooltip:
      'Consumer #2: тот же event, но другой DAG. Идеально для "веера" reactions.',
    detail: 'schedule=[orders_ds]',
  },
  c3: {
    id: 'c3',
    title: 'refresh_dashboard',
    type: 'consumer' as const,
    tooltip:
      'Consumer #3 с logical AND: schedule=[orders_ds, customers_ds] -- сработает, когда оба обновились.',
    detail: 'schedule=[orders_ds, customers_ds]',
  },
  ds2: {
    id: 'ds2',
    title: 's3://lake/clean/orders',
    type: 'dataset' as const,
    tooltip: 'Производный Dataset. Заполняется transform_orders.',
    detail: 'Dataset',
  },
  c4: {
    id: 'c4',
    title: 'load_warehouse',
    type: 'consumer' as const,
    tooltip:
      'Следующий уровень каскада. schedule=[clean_ds]. Так строятся data lineage chains без явного cron.',
    detail: 'schedule=[clean_ds]',
  },
};

const EDGES: Edge[] = [
  { from: 'producer', to: 'ds1' },
  { from: 'ds1', to: 'c1' },
  { from: 'ds1', to: 'c2' },
  { from: 'ds1', to: 'c3' },
  { from: 'c1', to: 'ds2' },
  { from: 'ds2', to: 'c4' },
];

const TYPE_STYLE = {
  producer: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-700',
  consumer: 'bg-blue-500/10 border-blue-400/40 text-blue-700',
  dataset: 'bg-amber-500/10 border-amber-400/40 text-amber-700',
};

function Node(props: { id: keyof typeof NODES }) {
  const n = () => NODES[props.id];
  return (
    <DiagramTooltip content={n().tooltip}>
      <div
        class={`rounded-md border px-3 py-2 text-[11px] font-mono ${TYPE_STYLE[n().type]} w-full`}
        tabindex={0}
      >
        <div class="font-semibold">{n().title}</div>
        <div class="text-[10px] opacity-70 mt-0.5">{n().detail}</div>
      </div>
    </DiagramTooltip>
  );
}

export function DatasetCascade() {
  return (
    <DiagramContainer
      title="Dataset cascade: 1 producer → N consumers → caskade"
      color="emerald"
      description="Event-driven. Никакого cron у consumer DAG-ов -- они спят, пока в dataset_event не появится новая запись."
    >
      <div class="flex flex-col gap-3">
        {/* Layer 0: producer */}
        <div class="flex justify-center">
          <div class="w-56">
            <Node id="producer" />
          </div>
        </div>

        <div class="flex justify-center text-[var(--ink-muted)] text-lg leading-none">
          ↓
        </div>

        {/* Layer 1: dataset 1 */}
        <div class="flex justify-center">
          <div class="w-72">
            <Node id="ds1" />
          </div>
        </div>

        <div class="flex justify-center text-[var(--ink-muted)] text-lg leading-none">
          ↓
        </div>

        {/* Layer 2: consumers */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Node id="c1" />
          <Node id="c2" />
          <Node id="c3" />
        </div>

        <div class="flex justify-center text-[var(--ink-muted)] text-lg leading-none">
          ↓
        </div>

        {/* Layer 3: derived dataset */}
        <div class="flex justify-center">
          <div class="w-72">
            <Node id="ds2" />
          </div>
        </div>

        <div class="flex justify-center text-[var(--ink-muted)] text-lg leading-none">
          ↓
        </div>

        {/* Layer 4: next consumer */}
        <div class="flex justify-center">
          <div class="w-56">
            <Node id="c4" />
          </div>
        </div>

        {/* Legend */}
        <div class="mt-2 flex flex-wrap gap-2 text-[10px] font-mono">
          <span class="px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-400/40 text-emerald-700">
            producer DAG
          </span>
          <span class="px-2 py-0.5 rounded border bg-amber-500/10 border-amber-400/40 text-amber-700">
            Dataset
          </span>
          <span class="px-2 py-0.5 rounded border bg-blue-500/10 border-blue-400/40 text-blue-700">
            consumer DAG
          </span>
        </div>

        <div class="text-[11px] text-[var(--ink-muted)] leading-relaxed">
          <span class="font-semibold text-[var(--ink-strong)]">
            Логика триггера:
          </span>{' '}
          consumer проверяет, что для <em>каждого</em> dataset в его{' '}
          <code>schedule</code> появился новый DatasetEvent с момента последнего
          DagRun. Это <em>AND</em>, а не OR. Запись хранится в{' '}
          <code>dataset_dag_run_queue</code>.
        </div>
      </div>

      {/* Hidden edges metadata for completeness (no SVG, list-based ↓) */}
      <span class="sr-only">
        {EDGES.map((e) => `${e.from}->${e.to}`).join(' ')}
      </span>
    </DiagramContainer>
  );
}
