/** @jsxImportSource solid-js */
/**
 * K8sExecutorWatcher
 *
 * KubernetesExecutor: scheduler стартует watcher thread, подписанный на
 * Watch endpoint K8s API. Каждый pod lifecycle event (Added / Modified /
 * Deleted) превращается в обновление TaskInstance.state в metadata DB.
 *
 * Static SVG-ish layout с tooltip-ами.
 */

import { DiagramContainer } from '@primitives/DiagramContainer';
import { DiagramTooltip } from '@primitives/Tooltip';
import { Arrow } from '@primitives/Arrow';

interface Event {
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed';
  k8sEvent: string;
  airflowState: string;
  tooltip: string;
  color: string;
}

const EVENTS: Event[] = [
  {
    phase: 'Pending',
    k8sEvent: 'ADDED',
    airflowState: 'queued → queued',
    tooltip:
      'Pod создан, ждёт scheduling. Если node selector / taints не match, pod может застрять и стриггерить timeout по pod_pending_timeout.',
    color: 'bg-slate-500/10 border-slate-400/40 text-slate-700',
  },
  {
    phase: 'Running',
    k8sEvent: 'MODIFIED',
    airflowState: 'queued → running',
    tooltip:
      'kubelet pull-нул образ, контейнер запущен. Watcher получает MODIFIED event с phase=Running, отправляет state update в KubernetesExecutor.event_buffer.',
    color: 'bg-amber-500/10 border-amber-400/40 text-amber-700',
  },
  {
    phase: 'Succeeded',
    k8sEvent: 'MODIFIED',
    airflowState: 'running → success',
    tooltip:
      'Контейнер вышел с exit code 0. KubernetesJobWatcher парсит phase и кладёт (key, state) в event_buffer. Scheduler читает буфер и UPDATE-ит TI.state.',
    color: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-700',
  },
  {
    phase: 'Failed',
    k8sEvent: 'MODIFIED',
    airflowState: 'running → up_for_retry / failed',
    tooltip:
      'Exit != 0 или OOMKilled. Если retries > 0 → up_for_retry. Pod удаляется только после kube_client_request_args.delete_options (опционально оставить для дебага).',
    color: 'bg-rose-500/10 border-rose-400/40 text-rose-700',
  },
];

export function K8sExecutorWatcher() {
  return (
    <DiagramContainer
      title="KubernetesExecutor: scheduler + watcher thread"
      color="blue"
      description="Long-polling Watch endpoint на /api/v1/namespaces/{ns}/pods. Один TCP connection стримит pod events до resourceVersion gap."
    >
      <div class="flex flex-col gap-4">
        {/* Top row: scheduler + k8s api */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Scheduler */}
          <DiagramTooltip content="Airflow Scheduler. При старте создаёт KubernetesJobWatcher (отдельный thread) и периодически читает event_buffer для применения state-апдейтов.">
            <div
              class="rounded-md border border-blue-400/40 bg-blue-500/10 p-3 text-xs font-mono text-blue-800"
              tabindex={0}
            >
              <div class="font-semibold mb-1">Airflow Scheduler</div>
              <div class="opacity-80">
                · KubernetesExecutor<br />
                · KubernetesJobWatcher (thread)<br />
                · event_buffer dict
              </div>
            </div>
          </DiagramTooltip>

          <div class="hidden md:flex flex-col items-center gap-1">
            <Arrow direction="right" label="watch?resourceVersion=N" />
            <Arrow direction="left" label="ADDED / MODIFIED / DELETED" />
          </div>

          {/* K8s API */}
          <DiagramTooltip content="kube-apiserver. Хранит etcd-bound state. Watch endpoint поддерживает HTTP long-polling: соединение живёт, события стримятся chunked transfer-encoding.">
            <div
              class="rounded-md border border-[var(--line-thin)] bg-[var(--bg-surface)] p-3 text-xs font-mono text-[var(--ink-strong)]"
              tabindex={0}
            >
              <div class="font-semibold mb-1">kube-apiserver</div>
              <div class="opacity-80">
                /api/v1/.../pods?watch=1<br />
                · resourceVersion cursor<br />
                · etcd backed
              </div>
            </div>
          </DiagramTooltip>
        </div>

        {/* Pod lifecycle events */}
        <div class="rounded-lg border border-[var(--line-thin)] bg-[var(--bg-surface)] p-3">
          <div class="text-xs font-mono text-[var(--ink-strong)] mb-2">
            Pod lifecycle → TaskInstance.state
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {EVENTS.map((e) => (
              <DiagramTooltip content={e.tooltip}>
                <div
                  class={`rounded-md border px-3 py-2 text-[11px] font-mono ${e.color}`}
                  tabindex={0}
                >
                  <div class="font-semibold">{e.phase}</div>
                  <div class="text-[10px] opacity-70 mt-0.5">
                    K8s: {e.k8sEvent}
                  </div>
                  <div class="text-[10px] mt-1">→ {e.airflowState}</div>
                </div>
              </DiagramTooltip>
            ))}
          </div>
        </div>

        {/* Gotchas */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-[var(--ink-muted)]">
          <div class="p-2 rounded bg-[var(--bg-surface)] border border-[var(--line-thin)]">
            <span class="block font-semibold text-[var(--ink-strong)]">
              Watch connection drop
            </span>
            Watcher переподключается с последним resourceVersion. Если gap → 410
            Gone → полный list + новый watch.
          </div>
          <div class="p-2 rounded bg-[var(--bg-surface)] border border-[var(--line-thin)]">
            <span class="block font-semibold text-[var(--ink-strong)]">
              Lost events
            </span>
            Если watcher не успевает обрабатывать -- ставится reconcile loop по
            kubernetes_executor.adopt_completed_pods.
          </div>
          <div class="p-2 rounded bg-[var(--bg-surface)] border border-[var(--line-thin)]">
            <span class="block font-semibold text-[var(--ink-strong)]">
              Multi-scheduler
            </span>
            Каждый scheduler держит свой watcher + leases на &quot;своих&quot;
            подах через label airflow-worker.
          </div>
        </div>
      </div>
    </DiagramContainer>
  );
}
