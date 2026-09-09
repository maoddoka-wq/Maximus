import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Database,
  FileCheck2,
  ListChecks,
  RefreshCw,
  ServerCog,
  XCircle,
} from 'lucide-react';
import {
  type DomainEventType,
  type StoreData,
} from '@/lib/store';
import { controlApi, type ControlBootstrap, type SystemHealth, type SystemHealthCheck } from '@/lib/control-api';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

function formatDate(value: string) {
  if (!value) return '—';
  if (value.includes('Aujourd’hui') || value.includes('Demain') || value.includes('juin')) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function healthStatusLabel(status: SystemHealth['status'] | SystemHealthCheck['status']) {
  if (status === 'UP' || status === 'OPERATIONAL') return 'Opérationnel';
  if (status === 'UNKNOWN') return 'À vérifier';
  if (status === 'DEGRADED') return 'Dégradé';
  return 'Indisponible';
}

function healthStatusClass(status: SystemHealth['status'] | SystemHealthCheck['status']) {
  if (status === 'UP' || status === 'OPERATIONAL') return 'bg-emerald-100 text-emerald-700';
  if (status === 'UNKNOWN') return 'bg-slate-100 text-slate-600';
  if (status === 'DEGRADED') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function EventIcon({ type }: { type: DomainEventType }) {
  if (type === 'APPROVAL_GRANTED') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (type === 'APPROVAL_REFUSED') return <XCircle size={16} className="text-rose-600" />;
  if (type === 'TASK_STATUS_CHANGED') return <Activity size={16} className="text-blue-600" />;
  if (type === 'TASK_CREATED') return <ListChecks size={16} className="text-amber-600" />;
  return <CircleDot size={16} className="text-slate-500" />;
}

function mergeControlRecords<T extends { id: string; entityType: string; entityId?: string; summary: string }>(local: T[], remote: T[]) {
  const records = new Map<string, T>();
  [...local, ...remote].forEach(record => records.set(`${record.entityType}:${record.entityId ?? ''}:${record.summary}`, record));
  return [...records.values()];
}

export function ControlCenterPage({
  data,
  companyId,
  isAdmin,
  companyAdmin,
  sectorManager,
  employeeId,
  scopeNodeId,
  focusHealth = false,
}: {
  data: StoreData;
  companyId?: string;
  isAdmin: boolean;
  companyAdmin?: boolean;
  sectorManager?: boolean;
  employeeId?: string;
  scopeNodeId?: string;
  focusHealth?: boolean;
}) {
  const canSeeAll = isAdmin || Boolean(companyAdmin);
  const [serverSnapshot, setServerSnapshot] = useState<ControlBootstrap | null>(null);
  const [syncError, setSyncError] = useState('');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthError, setHealthError] = useState('');
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const controlScope = isAdmin ? 'admin' : companyAdmin ? 'all' : sectorManager ? 'all' : 'assigned';
  const isWithinSectorScope = (taskSectorId?: string) => {
    if (!sectorManager || !scopeNodeId || !taskSectorId) return false;
    let node = data.orgNodes.find(candidate => candidate.id === taskSectorId && candidate.companyId === companyId);
    while (node) {
      if (node.id === scopeNodeId) return true;
      node = node.parentId ? data.orgNodes.find(candidate => candidate.id === node?.parentId && candidate.companyId === companyId) : undefined;
    }
    return false;
  };
  useEffect(() => {
    let active = true;
    controlApi.bootstrap({ companyId: isAdmin ? undefined : companyId, scope: controlScope })
      .then(snapshot => { if (active) { setServerSnapshot(snapshot); setSyncError(''); } })
      .catch(error => { if (active) setSyncError(error instanceof Error ? error.message : 'La synchronisation du journal est indisponible.'); });
    return () => { active = false; };
  }, [companyId, controlScope, employeeId, isAdmin]);
  useAutoRefresh(() => {
    let active = true;
    return controlApi.bootstrap({ companyId: isAdmin ? undefined : companyId, scope: controlScope })
      .then(snapshot => {
        if (active) {
          setServerSnapshot(snapshot);
          setSyncError('');
        }
      })
      .catch(error => {
        if (active) setSyncError(error instanceof Error ? error.message : 'La synchronisation du journal est indisponible.');
      })
      .finally(() => {
        active = false;
      });
  }, { enabled: true, intervalMs: 30_000 });

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const refreshHealth = () => {
      setHealthRefreshing(true);
      void controlApi.health()
        .then(snapshot => {
          if (!active) return;
          setHealth(snapshot);
          setHealthError('');
        })
        .catch(error => {
          if (active) setHealthError(error instanceof Error ? error.message : 'La surveillance système est indisponible.');
        })
        .finally(() => {
          if (active) setHealthRefreshing(false);
        });
    };
    refreshHealth();
    const interval = window.setInterval(refreshHealth, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!focusHealth || !isAdmin) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('[data-testid="system-health"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusHealth, isAdmin]);

  const controlTasks = useMemo(() => {
    const byId = new Map(data.controlTasks.map(task => [task.id, task]));
    serverSnapshot?.tasks.forEach(task => byId.set(task.id, task));
    return [...byId.values()];
  }, [data.controlTasks, serverSnapshot?.tasks]);
  const controlEvents = useMemo(() => mergeControlRecords(data.domainEvents, serverSnapshot?.events ?? []), [data.domainEvents, serverSnapshot?.events]);
  const controlAudit = useMemo(() => mergeControlRecords(data.auditEntries, serverSnapshot?.auditEntries ?? []), [data.auditEntries, serverSnapshot?.auditEntries]);

  const accessibleTasks = useMemo(() => controlTasks.filter(task => {
    const inScope = isAdmin || (task.companyId === companyId && (
      canSeeAll
      || task.assigneeEmployeeId === employeeId
      || isWithinSectorScope(task.sectorId)
    ));
    return inScope;
  }), [canSeeAll, companyId, controlTasks, employeeId, isAdmin, scopeNodeId, sectorManager]);
  const scopeTaskIds = new Set(accessibleTasks.map(task => task.id));
  const visibleEvents = controlEvents.filter(event => isAdmin || event.companyId === companyId && (canSeeAll || scopeTaskIds.has(event.entityId ?? '')));
  const visibleAudit = controlAudit.filter(entry => isAdmin || entry.companyId === companyId && (canSeeAll || scopeTaskIds.has(entry.entityId ?? '')));
  return (
    <div className="space-y-6 pb-10" data-testid="control-center">
      {isAdmin && (
        <section className="card-surface rounded-2xl border" data-testid="system-health">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]"><ServerCog size={15} /> Surveillance système</div>
              <h3 className="mt-2 text-lg font-bold">État de la production Render</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Les contrôles sont relancés automatiquement pendant que cette administration est ouverte.</p>
            </div>
            <div className="flex items-center gap-3">
              {healthRefreshing && <RefreshCw size={15} className="animate-spin text-[hsl(var(--muted-foreground))]" />}
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${healthStatusClass(health?.status ?? 'UNKNOWN')}`}>{health ? healthStatusLabel(health.status) : 'Vérification…'}</span>
            </div>
          </div>
          {health?.activeIncidents.length ? (
            <div className="m-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Problème détecté</p>
                {health.activeIncidents.map(incident => <div key={incident.id} className="mt-2 text-sm"><strong>{incident.title}</strong><p className="mt-0.5 text-xs">{incident.message} · Détecté {formatDateTime(incident.lastSeenAt)}</p></div>)}
              </div>
            </div>
          ) : healthError ? (
            <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{healthError}</div>
          ) : null}
          <div className="grid gap-3 p-5 pt-0 sm:grid-cols-2 xl:grid-cols-3">
            {health?.checks.map(check => (
              <div key={check.key} className="flex items-start gap-3 rounded-xl border p-4">
                <div className={`mt-0.5 rounded-full p-2 ${healthStatusClass(check.status)}`}>{check.key === 'database' ? <Database size={15} /> : <ServerCog size={15} />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">{check.label}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${healthStatusClass(check.status)}`}>{healthStatusLabel(check.status)}</span></div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{check.message}</p>
                </div>
              </div>
            ))}
            {!health && !healthError && <div className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">Vérification de la production en cours…</div>}
          </div>
          {health?.checkedAt && <p className="border-t px-5 py-3 text-[11px] text-[hsl(var(--muted-foreground))]">Dernière vérification : {formatDateTime(health.checkedAt)} · actualisation automatique toutes les 60 secondes</p>}
        </section>
      )}

      {syncError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{syncError}</div>}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="card-surface rounded-2xl border">
            <div className="border-b p-5"><h3 className="text-base font-bold">Flux d’événements</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les signaux produits par les opérations métier.</p></div>
            <div className="divide-y">
              {visibleEvents.slice(0, 6).map(event => <div key={event.id} className="flex gap-3 p-4"><div className="mt-0.5 rounded-full bg-[hsl(var(--muted))] p-2"><EventIcon type={event.type} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{event.label}</p><span className="shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(event.createdAt)}</span></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{event.summary}</p><p className="mt-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{event.actorName}</p></div></div>)}
              {visibleEvents.length === 0 && <div className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucun événement récent.</div>}
            </div>
          </div>
          <div className="card-surface rounded-2xl border">
            <div className="border-b p-5"><h3 className="text-base font-bold">Journal de contrôle</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les décisions restent attribuées et consultables.</p></div>
            <div className="divide-y">
              {visibleAudit.slice(0, 5).map(entry => <div key={entry.id} className="flex items-start gap-3 p-4"><div className="mt-0.5 text-[hsl(var(--primary))]"><FileCheck2 size={16} /></div><div><p className="text-xs font-bold">{entry.action.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.summary}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{entry.actorName} · {formatDate(entry.createdAt)}</p></div></div>)}
              {visibleAudit.length === 0 && <div className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucune trace disponible.</div>}
            </div>
            {visibleAudit.length > 5 && <div className="border-t p-4 text-center text-xs font-bold text-[hsl(var(--primary))]">+ {visibleAudit.length - 5} autres traces</div>}
          </div>
        </div>
      </section>

    </div>
  );
}