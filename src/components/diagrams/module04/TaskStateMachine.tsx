/** @jsxImportSource solid-js */
/**
 * TaskStateMachine
 *
 * Full Airflow 2.x / 3.x TaskInstance state machine (13 terminal/intermediate
 * states), color-coded by phase group: queued, running, terminal-success,
 * terminal-failure, retry/reschedule, skipped, removed.
 *
 * Click a state to highlight reachable transitions (in/out).
 */

import { createMemo, createSignal } from 'solid-js';
import { DiagramContainer } from '@primitives/DiagramContainer';
import { DiagramTooltip } from '@primitives/Tooltip';

type Group =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failure'
  | 'retry'
  | 'skipped'
  | 'removed';

interface StateDef {
  id: string;
  label: string;
  group: Group;
  tooltip: string;
  to: string[];
}

const STATES: StateDef[] = [
  {
    id: 'none',
    label: 'none',
    group: 'pending',
    tooltip: 'Свежесозданный TI в DagRun. Ещё не оценивался scheduler-ом.',
    to: ['scheduled', 'removed', 'upstream_failed'],
  },
  {
    id: 'scheduled',
    label: 'scheduled',
    group: 'pending',
    tooltip: 'Все зависимости выполнены, TI готов к отправке в executor queue.',
    to: ['queued', 'skipped', 'upstream_failed'],
  },
  {
    id: 'queued',
    label: 'queued',
    group: 'queued',
    tooltip: 'Отправлен в executor (Celery / K8s queue), ждёт worker слота.',
    to: ['running', 'failed', 'up_for_retry'],
  },
  {
    id: 'running',
    label: 'running',
    group: 'running',
    tooltip: 'Worker исполняет execute(). Heartbeat обновляется в DB.',
    to: ['success', 'failed', 'up_for_retry', 'up_for_reschedule'],
  },
  {
    id: 'success',
    label: 'success',
    group: 'success',
    tooltip: 'Терминал: execute() вернул без exception, post_execute() прошёл.',
    to: [],
  },
  {
    id: 'failed',
    label: 'failed',
    group: 'failure',
    tooltip:
      'Терминал: execute() бросил exception, retries исчерпаны. Триггерит downstream upstream_failed.',
    to: [],
  },
  {
    id: 'up_for_retry',
    label: 'up_for_retry',
    group: 'retry',
    tooltip:
      'Exception во время execute(), retries > 0. Через retry_delay перейдёт обратно в scheduled.',
    to: ['scheduled', 'failed'],
  },
  {
    id: 'up_for_reschedule',
    label: 'up_for_reschedule',
    group: 'retry',
    tooltip:
      'Sensor с mode="reschedule" не дождался условия. Worker освобождается, TI вернётся в scheduled через poke_interval.',
    to: ['scheduled', 'failed'],
  },
  {
    id: 'upstream_failed',
    label: 'upstream_failed',
    group: 'failure',
    tooltip: 'Один из upstream-тасков завершился failed -- TI не будет запущен.',
    to: [],
  },
  {
    id: 'skipped',
    label: 'skipped',
    group: 'skipped',
    tooltip:
      'BranchPythonOperator / ShortCircuit / trigger_rule пропустили задачу. Не считается ошибкой.',
    to: [],
  },
  {
    id: 'removed',
    label: 'removed',
    group: 'removed',
    tooltip:
      'TI был в DagRun, но в текущей версии DAG-а такого task_id больше нет (dynamic mapping shrink).',
    to: [],
  },
  {
    id: 'deferred',
    label: 'deferred',
    group: 'queued',
    tooltip:
      'Operator.defer() -- worker слот освобождён, ждём событие от Triggerer.',
    to: ['scheduled', 'failed'],
  },
  {
    id: 'restarting',
    label: 'restarting',
    group: 'retry',
    tooltip:
      'Сигнал на clear/restart получен во время running -- произойдёт re-queue.',
    to: ['queued', 'failed'],
  },
];

const GROUP_STYLE: Record<Group, string> = {
  pending:
    'bg-slate-500/10 border-slate-400/40 text-slate-700',
  queued:
    'bg-blue-500/10 border-blue-400/40 text-blue-700',
  running:
    'bg-amber-500/10 border-amber-400/40 text-amber-700',
  success:
    'bg-emerald-500/10 border-emerald-400/40 text-emerald-700',
  failure:
    'bg-rose-500/10 border-rose-400/40 text-rose-700',
  retry:
    'bg-purple-500/10 border-purple-400/40 text-purple-700',
  skipped:
    'bg-zinc-500/10 border-zinc-400/40 text-zinc-700',
  removed:
    'bg-stone-500/10 border-stone-400/40 text-stone-600',
};

const GROUP_LABEL: Record<Group, string> = {
  pending: 'pending',
  queued: 'queued / deferred',
  running: 'running',
  success: 'terminal success',
  failure: 'terminal failure',
  retry: 'retry / reschedule',
  skipped: 'skipped',
  removed: 'removed',
};

export function TaskStateMachine() {
  const [active, setActive] = createSignal<string | null>(null);

  const transitions = createMemo(() => {
    const a = active();
    if (!a) return { incoming: new Set<string>(), outgoing: new Set<string>() };
    const out = new Set(STATES.find((s) => s.id === a)?.to ?? []);
    const inc = new Set(
      STATES.filter((s) => s.to.includes(a)).map((s) => s.id),
    );
    return { incoming: inc, outgoing: out };
  });

  return (
    <DiagramContainer
      title="TaskInstance state machine (13 состояний)"
      color="purple"
      description="Click состояние -- подсветятся источники и валидные переходы. Цвет = группа в lifecycle."
    >
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {STATES.map((s) => {
            const isActive = () => active() === s.id;
            const isOutgoing = () => transitions().outgoing.has(s.id);
            const isIncoming = () => transitions().incoming.has(s.id);
            const dim = () => active() && !isActive() && !isOutgoing() && !isIncoming();
            return (
              <DiagramTooltip content={s.tooltip}>
                <button
                  type="button"
                  onClick={() =>
                    setActive((prev) => (prev === s.id ? null : s.id))
                  }
                  class={`w-full text-left rounded-md px-3 py-2 border text-xs font-mono transition-opacity ${
                    GROUP_STYLE[s.group]
                  } ${dim() ? 'opacity-30' : 'opacity-100'} ${
                    isActive() ? 'ring-2 ring-offset-1 ring-[var(--ink-muted)]' : ''
                  }`}
                >
                  <div class="font-semibold">{s.label}</div>
                  <div class="text-[10px] opacity-70 mt-0.5">
                    {GROUP_LABEL[s.group]}
                  </div>
                  {isActive() && s.to.length > 0 && (
                    <div class="text-[10px] mt-1 opacity-80">
                      → {s.to.join(', ')}
                    </div>
                  )}
                  {isActive() && s.to.length === 0 && (
                    <div class="text-[10px] mt-1 opacity-80">terminal</div>
                  )}
                </button>
              </DiagramTooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div class="flex flex-wrap gap-2 text-[10px] font-mono">
          {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
            <span
              class={`px-2 py-0.5 rounded border ${GROUP_STYLE[g]}`}
            >
              {GROUP_LABEL[g]}
            </span>
          ))}
        </div>
      </div>
    </DiagramContainer>
  );
}
