/** @jsxImportSource solid-js */
/**
 * CeleryPrefetchPitfall
 *
 * Worker с worker_prefetch_multiplier=4 (default): один long-running task
 * блокирует все 4 prefetch slots. Короткие задачи стоят в local queue worker-а
 * и не могут уехать на свободный соседний worker.
 *
 * Решение -- worker_prefetch_multiplier=1 + task_acks_late=True.
 */

import { DiagramContainer } from '@primitives/DiagramContainer';
import { DiagramTooltip } from '@primitives/Tooltip';

interface Slot {
  id: number;
  kind: 'long' | 'short' | 'empty';
  task: string;
  state: 'running' | 'reserved' | 'waiting';
  tooltip: string;
}

const SLOTS: Slot[] = [
  {
    id: 1,
    kind: 'long',
    task: 'etl_full_refresh',
    state: 'running',
    tooltip:
      'Долгая задача (~30 мин) занимает worker process. Все остальные 3 слота prefetch-ом уже застолблены этим же worker-ом.',
  },
  {
    id: 2,
    kind: 'short',
    task: 'send_alert',
    state: 'reserved',
    tooltip:
      'Prefetched: лежит в local memory worker-а, ack отправлен брокеру -- другой worker уже не может её забрать. Ждёт окончания slot #1.',
  },
  {
    id: 3,
    kind: 'short',
    task: 'refresh_dashboard',
    state: 'reserved',
    tooltip:
      'Та же история -- prefetch lock. Метрика "queued" в Airflow UI = 0, но реально задача стоит в worker-е, а не в Celery queue.',
  },
  {
    id: 4,
    kind: 'short',
    task: 'cleanup_xcom',
    state: 'reserved',
    tooltip:
      'Голодает за prefetched задачами. Особенно болезненно для sensors и алертов с SLA в минутах.',
  },
];

const KIND_STYLE: Record<Slot['kind'], string> = {
  long: 'bg-rose-500/10 border-rose-400/40 text-rose-700',
  short: 'bg-amber-500/10 border-amber-400/40 text-amber-700',
  empty: 'bg-[var(--bg-surface)] border-[var(--line-thin)] text-[var(--ink-muted)]',
};

export function CeleryPrefetchPitfall() {
  return (
    <DiagramContainer
      title="Celery prefetch pitfall: 1 long task → 4 blocked slots"
      color="amber"
      description="worker_prefetch_multiplier=4, worker_concurrency=1. Один long-running таск забирает 4 prefetch tokens из брокера."
    >
      <div class="flex flex-col gap-4">
        {/* Worker box */}
        <div class="rounded-lg border border-[var(--line-thin)] bg-[var(--bg-surface)] p-3">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-mono text-[var(--ink-strong)]">
              celery worker @ host-1
            </div>
            <div class="text-[10px] font-mono text-[var(--ink-subtle)]">
              prefetch_multiplier = 4 · concurrency = 1
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {SLOTS.map((slot) => (
              <DiagramTooltip content={slot.tooltip}>
                <div
                  class={`relative rounded-md border px-3 py-2 text-xs font-mono ${KIND_STYLE[slot.kind]}`}
                  tabindex={0}
                >
                  <div class="text-[10px] uppercase opacity-70 mb-1">
                    slot #{slot.id} · {slot.state}
                  </div>
                  <div class="font-semibold truncate">{slot.task}</div>
                  {slot.kind === 'long' && (
                    <div class="absolute -right-1 -top-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                      RUN
                    </div>
                  )}
                  {slot.kind === 'short' && slot.state === 'reserved' && (
                    <div class="absolute -right-1 -top-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                      held
                    </div>
                  )}
                </div>
              </DiagramTooltip>
            ))}
          </div>
        </div>

        {/* Idle worker box -- starved */}
        <div class="rounded-lg border border-[var(--line-thin)] bg-[var(--bg-surface)] p-3 opacity-80">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-mono text-[var(--ink-strong)]">
              celery worker @ host-2
            </div>
            <div class="text-[10px] font-mono text-emerald-700">
              idle · queue is empty (но задачи "висят" на host-1!)
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                class={`rounded-md border border-dashed px-3 py-2 text-xs font-mono ${KIND_STYLE.empty}`}
              >
                <div class="text-[10px] uppercase opacity-70 mb-1">
                  slot #{i} · idle
                </div>
                <div class="opacity-50">—</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fix box */}
        <div class="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3 text-[11px] text-emerald-800 font-mono leading-relaxed">
          <div class="font-semibold mb-1">Fix</div>
          worker_prefetch_multiplier = 1<br />
          task_acks_late = True<br />
          <span class="opacity-70">
            → broker отдаёт по 1 задаче на свободный worker слот; ack только после
            success.
          </span>
        </div>
      </div>
    </DiagramContainer>
  );
}
