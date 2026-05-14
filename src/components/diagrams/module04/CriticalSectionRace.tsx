/** @jsxImportSource solid-js */
/**
 * CriticalSectionRace
 *
 * HA Scheduler race: two scheduler processes simultaneously enter the critical
 * section (DagFileProcessor → scheduling loop). One wins the row-level lock via
 * `SELECT ... FOR UPDATE NOWAIT`, the other receives a NOWAIT error and skips
 * the cycle without blocking.
 */

import { createSignal } from 'solid-js';
import { DiagramContainer } from '@primitives/DiagramContainer';
import { DiagramTooltip } from '@primitives/Tooltip';
import { FlowNode } from '@primitives/FlowNode';
import { Arrow } from '@primitives/Arrow';

type Winner = 'a' | 'b';

export function CriticalSectionRace() {
  const [winner, setWinner] = createSignal<Winner>('a');

  const toggle = () => setWinner((w) => (w === 'a' ? 'b' : 'a'));

  const Lane = (props: {
    name: 'Scheduler A' | 'Scheduler B';
    isWinner: boolean;
  }) => (
    <div class="flex flex-col items-center gap-2 flex-1">
      <DiagramTooltip
        content={`${props.name}: вызывает _do_scheduling() и пытается захватить row lock на dag_run / task_instance таблицах через SELECT ... FOR UPDATE NOWAIT.`}
      >
        <FlowNode variant={props.isWinner ? 'connector' : 'service'} size="md" tabIndex={0}>
          {props.name}
          <br />
          <span class="text-xs opacity-75">SchedulerJobRunner</span>
        </FlowNode>
      </DiagramTooltip>

      <Arrow direction="down" label="SELECT FOR UPDATE NOWAIT" />

      <DiagramTooltip
        content={
          props.isWinner
            ? 'Этот процесс получил row-level lock первым. Выполняет scheduling decisions, обновляет state, коммитит транзакцию -- lock освобождается.'
            : 'Postgres мгновенно возвращает ошибку "could not obtain lock on row ... NOWAIT". Scheduler ловит её, логирует, пропускает loop iteration и пробует на следующем тике (без блокировки).'
        }
      >
        <div
          class={`px-3 py-2 rounded-md text-xs font-mono border ${
            props.isWinner
              ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-700'
              : 'bg-rose-500/10 border-rose-400/40 text-rose-700'
          }`}
          tabindex={0}
        >
          {props.isWinner ? 'lock acquired' : 'NOWAIT error'}
        </div>
      </DiagramTooltip>

      <div
        class={`mt-1 text-[11px] font-mono ${
          props.isWinner ? 'text-emerald-700' : 'text-rose-700'
        }`}
      >
        {props.isWinner ? '→ scheduling proceeds' : '→ skip cycle, retry'}
      </div>
    </div>
  );

  return (
    <DiagramContainer
      title="HA Scheduler: critical section race"
      color="rose"
      description="Active-active scheduler топология. Pessimistic row lock через SELECT FOR UPDATE NOWAIT гарантирует один писатель в critical section."
    >
      <div class="flex flex-col gap-4">
        <div class="flex items-stretch justify-center gap-4">
          <Lane name="Scheduler A" isWinner={winner() === 'a'} />

          <div class="flex flex-col items-center justify-center px-2">
            <div class="text-xs font-mono text-[var(--ink-muted)] mb-1">
              shared row
            </div>
            <div class="px-3 py-2 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-700 text-[11px] font-mono">
              dag_run.id = X<br />
              FOR UPDATE NOWAIT
            </div>
            <div class="mt-2 text-[10px] text-[var(--ink-subtle)]">
              Postgres
            </div>
          </div>

          <Lane name="Scheduler B" isWinner={winner() === 'b'} />
        </div>

        <div class="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={toggle}
            class="px-3 py-1 rounded-md border border-[var(--line-thin)] bg-[var(--bg-surface)] text-xs text-[var(--ink-default)] hover:bg-[var(--bg-deep)]"
          >
            Переиграть гонку
          </button>
          <span class="text-[11px] text-[var(--ink-subtle)] font-mono">
            winner = {winner() === 'a' ? 'Scheduler A' : 'Scheduler B'}
          </span>
        </div>

        <div class="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-[var(--ink-muted)]">
          <div class="p-2 rounded bg-[var(--bg-surface)] border border-[var(--line-thin)]">
            <span class="block font-semibold text-[var(--ink-strong)]">
              Почему NOWAIT
            </span>
            При обычном FOR UPDATE проигравший спит до коммита победителя --
            scheduler выглядит "зависшим".
          </div>
          <div class="p-2 rounded bg-[var(--bg-surface)] border border-[var(--line-thin)]">
            <span class="block font-semibold text-[var(--ink-strong)]">
              Stateless schedulers
            </span>
            Никакого Zookeeper / leader election -- весь координационный state
            живёт в metadata DB.
          </div>
          <div class="p-2 rounded bg-[var(--bg-surface)] border border-[var(--line-thin)]">
            <span class="block font-semibold text-[var(--ink-strong)]">
              Live-locks
            </span>
            При высоком QPS оба процесса могут систематически проигрывать одной
            и той же транзакции -- ловится по метрикам `scheduler_loop_duration`.
          </div>
        </div>
      </div>
    </DiagramContainer>
  );
}
