import { useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card } from '@workspace/maximus-design-system/components/ui/card';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Label } from '@workspace/maximus-design-system/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/maximus-design-system/components/ui/select';
import { WorkspaceTabs } from '@workspace/maximus-design-system/components/ui/workspace-tabs';
import {
  demoDate,
  downloadPresenceCsv,
  presenceMetrics,
  presenceRows,
  presenceTabs,
  type PresenceMetric,
  type PresenceTabId,
} from './presence-dashboard-data';

function MetricCard({ metric }: { metric: PresenceMetric }) {
  const emphasis =
    metric.emphasis === 'primary'
      ? 'text-primary'
      : metric.emphasis === 'destructive'
        ? 'text-destructive'
        : '';

  return (
    <Card className="min-w-0 p-4">
      <p className="text-xs text-muted-foreground">{metric.label}</p>
      <p className={`mt-2 text-2xl font-bold ${emphasis}`}>{metric.value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{metric.detail}</p>
    </Card>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="section-heading flex items-center justify-between gap-4 border-b p-5">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone: 'neutral' | 'warning' | 'danger';
}) {
  const variant =
    tone === 'danger' ? 'destructive' : tone === 'warning' ? 'outline' : 'secondary';

  return <Badge variant={variant}>{status}</Badge>;
}

function Dashboard({
  date,
  setDate,
  period,
  setPeriod,
  sector,
  setSector,
}: {
  date: string;
  setDate: (value: string) => void;
  period: string;
  setPeriod: (value: string) => void;
  sector: string;
  setSector: (value: string) => void;
}) {
  const alerts = presenceRows.filter((row) => row.issue);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-muted/35 p-4">
        <label className="min-w-[140px] flex-1 text-xs font-bold">
          Date
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1.5"
          />
        </label>
        <div className="min-w-[130px] flex-1">
          <Label className="text-xs font-bold">Période</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[150px] flex-1">
          <Label className="text-xs font-bold">Secteur</Label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les secteurs</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Atelier">Atelier</SelectItem>
              <SelectItem value="Logistique">Logistique</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadPresenceCsv(presenceRows, date)}
        >
          <Download aria-hidden="true" />
          Exporter
        </Button>
      </div>

      <div className="mobile-stat-grid grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {presenceMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Dernières entrées / sorties">
          {presenceRows.some((row) => row.arrival !== '—') ? (
            <div className="divide-y">
              {presenceRows
                .filter((row) => row.arrival !== '—')
                .slice(0, 8)
                .map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <strong>{row.name}</strong>
                      <p className="text-xs text-muted-foreground">
                        {row.arrival} → {row.exit}
                      </p>
                    </div>
                    <StatusBadge status={row.status} tone={row.statusTone} />
                  </div>
                ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucune donnée pour les filtres sélectionnés.
            </p>
          )}
        </Panel>

        <Panel title="Alertes opérationnelles">
          <div className="space-y-3">
            {alerts.length ? (
              alerts.slice(0, 8).map((row) => (
                <div
                  key={row.id}
                  className="flex gap-3 rounded-lg bg-muted/45 p-3"
                >
                  <AlertTriangle
                    aria-hidden="true"
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <div>
                    <p className="text-sm font-bold">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.issue}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucune alerte active.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function Current() {
  const [date, setDate] = useState(demoDate);
  const [period, setPeriod] = useState('day');
  const [sector, setSector] = useState('all');
  const [activeTab, setActiveTab] = useState<PresenceTabId>('dashboard');

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="mobile-hero card-surface rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.2em] text-primary">
                Gestion des Présences
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-.03em] sm:text-4xl">
                Le rythme de vos équipes, en clair.
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-6 text-muted-foreground">
                Pointage, absences, horaires et temps travaillé dans un seul espace.
              </p>
              <p className="mt-3 text-xs font-semibold text-primary">
                Actualisation automatique active · données vérifiées toutes les 5 secondes.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-bold">
                Date active
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1.5"
                />
              </label>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw aria-hidden="true" />
                Actualiser
              </Button>
            </div>
          </div>
          <WorkspaceTabs
            items={presenceTabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as PresenceTabId)}
            ariaLabel="Menu Gestion des Présences"
            className="mt-7 border-t pt-5"
          />
        </header>

        {activeTab === 'dashboard' ? (
          <Dashboard
            date={date}
            setDate={setDate}
            period={period}
            setPeriod={setPeriod}
            sector={sector}
            setSector={setSector}
          />
        ) : (
          <Card className="flex items-center justify-between gap-3 p-5">
            <div>
              <p className="font-bold">
                {presenceTabs.find((tab) => tab.id === activeTab)?.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cette comparaison porte sur le tableau de bord mobile.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('dashboard')}
            >
              Revenir
              <ChevronRight aria-hidden="true" className="rotate-180" />
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}