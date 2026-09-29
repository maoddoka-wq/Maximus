import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card } from '@workspace/maximus-design-system/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/maximus-design-system/components/ui/collapsible';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Label } from '@workspace/maximus-design-system/components/ui/label';
import { Progress } from '@workspace/maximus-design-system/components/ui/progress';
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
  type PresenceTabId,
} from './presence-dashboard-data';

const primaryMetrics = presenceMetrics.slice(0, 4);
const additionalMetrics = presenceMetrics.slice(4, 9);
const presenceRate = 78;

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

export function Compact() {
  const [date, setDate] = useState(demoDate);
  const [period, setPeriod] = useState('day');
  const [sector, setSector] = useState('all');
  const [activeTab, setActiveTab] = useState<PresenceTabId>('dashboard');
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const issueCount = presenceRows.filter((row) => row.issue).length;

  return (
    <main className="min-h-screen bg-background p-3 text-foreground">
      <div className="mx-auto max-w-5xl space-y-3">
        <header className="card-surface rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mono text-[10px] uppercase tracking-[.2em] text-primary">
                Gestion des Présences
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-.03em]">
                Tableau de bord
              </h1>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Actualiser les présences"
              onClick={() => window.location.reload()}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </div>

          <label className="mt-3 block text-xs font-bold">
            Date active
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1"
            />
          </label>

          <WorkspaceTabs
            items={presenceTabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as PresenceTabId)}
            ariaLabel="Menu Gestion des Présences"
            className="mt-3 border-t pt-3"
          />
        </header>

        {activeTab === 'dashboard' ? (
          <>
            <section aria-label="Indicateurs de présence" className="space-y-3">
              <Card className="p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Présents aujourd’hui
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-[-.05em]">
                      14
                      <span className="ml-1 text-base font-medium text-muted-foreground">
                        / 18 actifs
                      </span>
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{presenceRate}%</p>
                </div>
                <Progress
                  value={presenceRate}
                  aria-label={`Taux de présence : ${presenceRate} %`}
                  className="mt-3"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Taux de présence sur la période sélectionnée
                </p>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {primaryMetrics.slice(2).map((metric) => (
                  <Card
                    key={metric.label}
                    className="min-w-0 p-3"
                  >
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p
                      className={`mt-1 text-2xl font-bold ${
                        metric.emphasis === 'destructive'
                          ? 'text-destructive'
                          : 'text-primary'
                      }`}
                    >
                      {metric.value}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {metric.detail}
                    </p>
                  </Card>
                ))}
              </div>

              <Collapsible
                open={showMoreMetrics}
                onOpenChange={setShowMoreMetrics}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex min-h-11 w-full justify-between rounded-none px-4 text-left"
                      aria-expanded={showMoreMetrics}
                    >
                      <span className="font-semibold">
                        {showMoreMetrics ? 'Masquer' : 'Afficher'} les 5 autres indicateurs
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`transition-transform ${showMoreMetrics ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-2 border-t p-3">
                      {additionalMetrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="min-w-0 rounded-lg bg-muted/55 p-3"
                        >
                          <p className="text-[11px] text-muted-foreground">
                            {metric.label}
                          </p>
                          <p className="mt-1 text-base font-bold">{metric.value}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {metric.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </section>

            <section aria-label="Filtres du tableau de bord">
              <Card className="grid grid-cols-2 items-end gap-2 p-3">
                <div className="min-w-0">
                  <Label className="text-xs font-bold">Période</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Jour</SelectItem>
                      <SelectItem value="week">Semaine</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs font-bold">Secteur</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Atelier">Atelier</SelectItem>
                      <SelectItem value="Logistique">Logistique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="col-span-2 w-full"
                  onClick={() => downloadPresenceCsv(presenceRows, date)}
                >
                  <Download aria-hidden="true" />
                  Exporter les présences
                </Button>
              </Card>
            </section>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h2 className="font-bold">Suivi du jour</h2>
                  <p className="text-xs text-muted-foreground">
                    Présences et alertes regroupées
                  </p>
                </div>
                <Badge variant={issueCount ? 'outline' : 'secondary'}>
                  {issueCount} à suivre
                </Badge>
              </div>
              <div className="divide-y px-4">
                {presenceRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{row.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.sector} · {row.arrival} → {row.exit}
                      </p>
                      {row.issue && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <AlertTriangle
                            aria-hidden="true"
                            size={12}
                            className="shrink-0"
                          />
                          {row.issue}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={row.status} tone={row.statusTone} />
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-between gap-3 p-4">
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
              Revenir au tableau de bord
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}