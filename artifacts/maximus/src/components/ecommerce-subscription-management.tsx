import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Search, ShieldCheck, ShoppingCart } from 'lucide-react';
import { ActionButton } from '@workspace/maximus-design-system/components/ui/action-button';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Skeleton } from '@workspace/maximus-design-system/components/ui/skeleton';
import { StatusBadge as DesignSystemStatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';
import {
  loadEcommerceSubscriptions,
  updateEcommerceSubscription,
  type CompanyEcommerceSubscription,
  type EcommerceSubscriptionAccessStatus,
} from '@/lib/ecommerce-subscription-api';
import type { Company } from '@/lib/store';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';

type EcommerceSubscriptionManagementProps = {
  companies: Company[];
  onRefresh: () => Promise<boolean>;
};

function amountFromInput(value: string): { valid: boolean; amount: number | null } {
  const normalized = value.trim();
  if (normalized === '') return { valid: true, amount: null };

  const amount = Number(normalized);
  return {
    valid: Number.isSafeInteger(amount) && amount >= 0,
    amount: Number.isSafeInteger(amount) && amount >= 0 ? amount : null,
  };
}

function enabledStatus(status: EcommerceSubscriptionAccessStatus) {
  return status !== 'INACTIF';
}

function paymentAccessStatus(status: string | null) {
  const normalized = status?.trim().toLocaleUpperCase('fr') ?? '';
  if (['SUSPENDED', 'SUSPENDU'].includes(normalized)) return 'SUSPENDU';
  if (['EXPIRED', 'EXPIRÉ', 'EXPIRE'].includes(normalized)) return 'EXPIRÉ';
  if (['PAYMENT_REQUIRED', 'IMPAYÉ', 'UNPAID'].includes(normalized)) return 'IMPAYÉ';
  if (['ACTIVE', 'ACTIF'].includes(normalized)) return 'ACTIF';
  if (['NOT_MANAGED', 'UNAVAILABLE'].includes(normalized)) return 'NON CONFIGURÉ';
  return status || 'NON CONFIGURÉ';
}

function formatPaidThrough(value: string | null) {
  if (!value) return 'Aucune échéance enregistrée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date indisponible';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatAmount(amount: number | null) {
  if (amount === null) return 'À définir';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

export function EcommerceSubscriptionManagement({
  companies,
  onRefresh,
}: EcommerceSubscriptionManagementProps) {
  const [entries, setEntries] = useState<CompanyEcommerceSubscription[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingCompanyIds, setSavingCompanyIds] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const result = await loadEcommerceSubscriptions();
        if (cancelled) return;
        setEntries(result);
        setLoadError('');
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Les abonnements E-commerce sont indisponibles.');
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    void load(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(false);
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadAttempt]);

  const entriesByCompany = useMemo(
    () => new Map(entries.map(entry => [entry.companyId, entry])),
    [entries],
  );
  const visibleCompanies = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('fr');
    return [...companies]
      .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
      .filter(company => !query || `${company.name} ${company.email}`.toLocaleLowerCase('fr').includes(query));
  }, [companies, searchTerm]);

  const save = async (
    company: Company,
    status: EcommerceSubscriptionAccessStatus,
    currentEntry: CompanyEcommerceSubscription,
  ) => {
    const inputValue = priceDrafts[company.id]
      ?? (currentEntry.monthlyAmount === null ? '' : String(currentEntry.monthlyAmount));
    const parsedAmount = amountFromInput(inputValue);
    if (!parsedAmount.valid) {
      showAppToast('Saisissez un montant entier positif ou égal à zéro.', 'warning');
      return;
    }
    if (enabledStatus(status) && (parsedAmount.amount === null || parsedAmount.amount <= 0)) {
      showAppToast('Définissez un tarif mensuel strictement positif avant d’activer l’accès.', 'warning');
      return;
    }

    setSavingCompanyIds(previous => ({ ...previous, [company.id]: true }));
    try {
      const updated = await updateEcommerceSubscription(company.id, {
        status,
        monthlyAmount: parsedAmount.amount,
      });
      setEntries(previous => [
        ...previous.filter(entry => entry.companyId !== company.id),
        updated,
      ]);
      setPriceDrafts(previous => {
        const next = { ...previous };
        delete next[company.id];
        return next;
      });

      const refreshed = await onRefresh();
      showAppToast(
        refreshed
          ? `Abonnement E-commerce de ${company.name} enregistré.`
          : `Abonnement E-commerce de ${company.name} enregistré. L’accès sera actualisé au prochain rafraîchissement.`,
        refreshed ? 'success' : 'warning',
      );
    } catch (error) {
      showAppToast(
        error instanceof Error ? error.message : 'La mise à jour de l’abonnement E-commerce a échoué.',
        'error',
      );
    } finally {
      setSavingCompanyIds(previous => ({ ...previous, [company.id]: false }));
    }
  };

  return (
    <section className="card-surface overflow-hidden rounded-2xl" data-testid="section-ecommerce-subscriptions">
      <div className="border-b border-[hsl(var(--border))] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Accès et tarif par entreprise</p>
            <h2 className="mt-2 flex items-center gap-2 text-xl font-bold">
              <ShoppingCart size={19} className="text-[hsl(var(--primary))]" />
              Abonnements E-commerce
            </h2>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Définissez le prix mensuel en FCFA et activez ou suspendez l’accès au module pour chaque entreprise.
              Cette configuration n’effectue aucun prélèvement.
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              data-testid="input-ecommerce-company-search"
              aria-label="Rechercher une entreprise pour l’abonnement E-commerce"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Rechercher une entreprise…"
              className="w-full bg-[hsl(var(--card))] py-2.5 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="m-5 rounded-lg border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]">
          <p>{loadError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="button-ecommerce-subscriptions-retry"
            onClick={() => {
              setLoading(true);
              setLoadAttempt(attempt => attempt + 1);
            }}
            className="mt-2 inline-flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw size={13} /> Réessayer
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 p-5" role="status" aria-label="Chargement des accès E-commerce">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : companies.length === 0 ? (
        <p className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucune entreprise à configurer.</p>
      ) : visibleCompanies.length === 0 ? (
        <p className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Aucune entreprise ne correspond à cette recherche.</p>
      ) : (
        <div className="divide-y divide-[hsl(var(--border))]">
          {visibleCompanies.map(company => {
            const entry = entriesByCompany.get(company.id) ?? {
              companyId: company.id,
              companyName: company.name,
              status: 'INACTIF' as const,
              monthlyAmount: null,
              updatedAt: null,
              subscriptionStatus: null,
              paidThroughAt: null,
              daysRemaining: null,
              lastPaymentStatus: null,
            };
            const active = enabledStatus(entry.status);
            const inputValue = priceDrafts[company.id]
              ?? (entry.monthlyAmount === null ? '' : String(entry.monthlyAmount));
            const parsedAmount = amountFromInput(inputValue);
            const saving = savingCompanyIds[company.id] === true;
            const nextStatus = active ? 'INACTIF' : 'ACTIF';
            const subscriptionStatus = paymentAccessStatus(entry.subscriptionStatus);

            return (
              <article
                key={company.id}
                data-testid={`row-ecommerce-subscription-${company.id}`}
                className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-bold" data-testid={`text-ecommerce-company-${company.id}`}>{company.name}</h3>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Accès module</span>
                    <DesignSystemStatusBadge status={entry.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{company.email || company.id}</p>
                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    Tarif actuel : <strong className="text-[hsl(var(--foreground))]" data-testid={`text-ecommerce-price-${company.id}`}>{formatAmount(entry.monthlyAmount)}</strong>
                    <span> / mois</span>
                  </p>
                  <div className="mt-3 rounded-lg bg-[hsl(var(--muted)/.45)] p-3" data-testid={`subscription-billing-state-${company.id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">État de facturation</span>
                      <DesignSystemStatusBadge status={subscriptionStatus} />
                    </div>
                    <p className="mt-2 text-xs">
                      Couvert jusqu’au <strong>{formatPaidThrough(entry.paidThroughAt)}</strong>
                    </p>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {entry.daysRemaining === null
                        ? 'Durée restante non renseignée'
                        : entry.daysRemaining > 0
                          ? `${entry.daysRemaining} jour${entry.daysRemaining > 1 ? 's' : ''} restant${entry.daysRemaining > 1 ? 's' : ''}`
                          : entry.daysRemaining === 0
                            ? 'Échu'
                            : `Échu depuis ${Math.abs(entry.daysRemaining)} jour${Math.abs(entry.daysRemaining) > 1 ? 's' : ''}`}
                      {entry.lastPaymentStatus && <span> · Dernier paiement : {entry.lastPaymentStatus}</span>}
                    </p>
                  </div>
                  {entry.status === 'MAINTENANCE' && (
                    <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Le module est en maintenance côté MAXIMUS.</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-xs font-semibold">
                    Prix mensuel (FCFA)
                    <Input
                      data-testid={`input-ecommerce-price-${company.id}`}
                      aria-label={`Prix mensuel E-commerce pour ${company.name}`}
                      type="number"
                      min={enabledStatus(entry.status) ? '1' : '0'}
                      max="2147483647"
                      step="1"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={event => setPriceDrafts(previous => ({ ...previous, [company.id]: event.target.value }))}
                      disabled={loading || loadError !== '' || saving}
                      placeholder="Prix à définir"
                      className="mt-1.5 w-full bg-[hsl(var(--card))] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      primary
                      icon={Check}
                      testId={`button-ecommerce-save-price-${company.id}`}
                      disabled={loading || loadError !== '' || !parsedAmount.valid || (enabledStatus(entry.status) && (parsedAmount.amount === null || parsedAmount.amount <= 0))}
                      loading={saving}
                      onClick={() => save(company, entry.status, entry)}
                    >
                      Enregistrer
                    </ActionButton>
                    <ActionButton
                      icon={active ? RefreshCw : ShieldCheck}
                      testId={`button-ecommerce-toggle-${company.id}`}
                      disabled={loading || loadError !== '' || (nextStatus === 'ACTIF' && (parsedAmount.amount === null || parsedAmount.amount <= 0))}
                      loading={saving}
                      onClick={() => save(company, nextStatus, entry)}
                    >
                      {active ? 'Suspendre' : 'Activer'}
                    </ActionButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}