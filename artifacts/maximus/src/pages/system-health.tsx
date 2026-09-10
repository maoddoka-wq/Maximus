import { useEffect, useState } from 'react';
import { AlertTriangle, Database, RefreshCw, ServerCog } from 'lucide-react';
import { controlApi, type SystemHealth, type SystemHealthCheck } from '@/lib/control-api';

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

export function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setRefreshing(true);
      void controlApi.health()
        .then(snapshot => {
          if (!active) return;
          setHealth(snapshot);
          setError('');
        })
        .catch(reason => {
          if (active) setError(reason instanceof Error ? reason.message : 'La surveillance système est indisponible.');
        })
        .finally(() => {
          if (active) setRefreshing(false);
        });
    };

    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="card-surface rounded-2xl border" data-testid="system-health">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
            <ServerCog size={15} /> Surveillance système
          </div>
          <h3 className="mt-2 text-lg font-bold">État de la production Render</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Vérifiez séparément l’application, PostgreSQL et le schéma de production.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <RefreshCw size={15} className="animate-spin text-[hsl(var(--muted-foreground))]" />}
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${healthStatusClass(health?.status ?? 'UNKNOWN')}`}>
            {health ? healthStatusLabel(health.status) : 'Vérification…'}
          </span>
        </div>
      </div>
      {health?.activeIncidents.length ? (
        <div className="m-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold">Problème détecté</p>
            {health.activeIncidents.map(incident => (
              <div key={incident.id} className="mt-2 text-sm">
                <strong>{incident.title}</strong>
                <p className="mt-0.5 text-xs">{incident.message} · Détecté {formatDateTime(incident.lastSeenAt)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      ) : null}
      <div className="grid gap-3 p-5 pt-0 sm:grid-cols-2 xl:grid-cols-3">
        {health?.checks.map(check => (
          <div key={check.key} className="flex items-start gap-3 rounded-xl border p-4">
            <div className={`mt-0.5 rounded-full p-2 ${healthStatusClass(check.status)}`}>
              {check.key === 'database' ? <Database size={15} /> : <ServerCog size={15} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{check.label}</p>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${healthStatusClass(check.status)}`}>
                  {healthStatusLabel(check.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{check.message}</p>
            </div>
          </div>
        ))}
        {!health && !error && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">
            Vérification de la production en cours…
          </div>
        )}
      </div>
      {health?.checkedAt && (
        <p className="border-t px-5 py-3 text-[11px] text-[hsl(var(--muted-foreground))]">
          Dernière vérification : {formatDateTime(health.checkedAt)} · actualisation automatique toutes les 60 secondes
        </p>
      )}
    </section>
  );
}