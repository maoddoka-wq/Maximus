import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Search } from 'lucide-react';
import { ActionButton } from '@workspace/maximus-design-system/components/ui/action-button';
import { StatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';
import {
  loadSubscriptionBilling,
  updateCompanySubscriptionPrice,
  updateSubscriptionModulePrice,
  type SubscriptionBillingCompany,
  type SubscriptionModulePrice,
} from '@/lib/subscription-billing-api';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';

function amountText(amount: number | null) {
  if (amount === null) return 'À définir';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

function parseAmount(value: string): { valid: boolean; amount: number | null } {
  if (value.trim() === '') return { valid: true, amount: null };
  const amount = Number(value);
  return {
    valid: Number.isSafeInteger(amount) && amount >= 0,
    amount: Number.isSafeInteger(amount) && amount >= 0 ? amount : null,
  };
}

type CatalogModule = Pick<SubscriptionModulePrice, 'id' | 'name'>;

export function SubscriptionPricingManagement({ catalogModules }: { catalogModules: CatalogModule[] }) {
  const fallbackModules = useMemo(
    () => catalogModules.map(module => ({ ...module, monthlyAmount: null })),
    [catalogModules],
  );
  const [modules, setModules] = useState<SubscriptionModulePrice[]>(fallbackModules);
  const [companies, setCompanies] = useState<SubscriptionBillingCompany[]>([]);
  const [moduleDrafts, setModuleDrafts] = useState<Record<string, string>>({});
  const [companyDrafts, setCompanyDrafts] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const result = await loadSubscriptionBilling();
        if (cancelled) return;
        setModules(result.modules);
        setCompanies(result.companies);
        setLoadError('');
      } catch (error) {
        if (cancelled) return;
        setModules(fallbackModules);
        setCompanies([]);
        setLoadError(error instanceof Error ? error.message : 'La grille tarifaire est indisponible.');
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
  }, [fallbackModules, retry]);

  const visibleCompanies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return companies.filter(company =>
      !query || `${company.companyName} ${company.companyId}`.toLocaleLowerCase('fr').includes(query),
    );
  }, [companies, search]);

  const saveModule = async (module: SubscriptionModulePrice) => {
    const amount = parseAmount(moduleDrafts[module.id] ?? (module.monthlyAmount === null ? '' : String(module.monthlyAmount)));
    if (!amount.valid) {
      showAppToast('Saisissez un montant entier positif ou nul.', 'warning');
      return;
    }
    setSavingKeys(previous => ({ ...previous, [`module:${module.id}`]: true }));
    try {
      const saved = await updateSubscriptionModulePrice(module.id, amount.amount);
      setModules(previous => previous.map(item => item.id === module.id ? saved : item));
      setModuleDrafts(previous => {
        const next = { ...previous };
        delete next[module.id];
        return next;
      });
      showAppToast(`Tarif de ${module.name} enregistré.`, 'success');
      const refreshed = await loadSubscriptionBilling();
      setCompanies(refreshed.companies);
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le tarif du module n’a pas été enregistré.', 'error');
    } finally {
      setSavingKeys(previous => ({ ...previous, [`module:${module.id}`]: false }));
    }
  };

  const persistCompanyAmount = async (
    company: SubscriptionBillingCompany,
    customAmount: number | null,
    successMessage: string,
  ) => {
    setSavingKeys(previous => ({ ...previous, [`company:${company.companyId}`]: true }));
    try {
      await updateCompanySubscriptionPrice(company.companyId, customAmount);
      setCompanyDrafts(previous => {
        const next = { ...previous };
        delete next[company.companyId];
        return next;
      });
      const refreshed = await loadSubscriptionBilling();
      setCompanies(refreshed.companies);
      showAppToast(successMessage, 'success');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le prix personnalisé n’a pas été enregistré.', 'error');
    } finally {
      setSavingKeys(previous => ({ ...previous, [`company:${company.companyId}`]: false }));
    }
  };

  const saveCompany = async (company: SubscriptionBillingCompany) => {
    const amount = parseAmount(companyDrafts[company.companyId] ?? (company.customAmount === null ? '' : String(company.customAmount)));
    if (!amount.valid) {
      showAppToast('Saisissez un montant entier positif ou nul.', 'warning');
      return;
    }
    await persistCompanyAmount(
      company,
      amount.amount,
      amount.amount === null
        ? `Le tarif automatique est rétabli pour ${company.companyName}.`
        : amount.amount === 0
          ? `${company.companyName} est maintenant en mode gratuit.`
          : `Le prix mensuel de ${company.companyName} est enregistré.`,
    );
  };

  const setCompanyBillingMode = async (company: SubscriptionBillingCompany, mode: 'FREE' | 'PAID') => {
    const alreadyFree = company.customAmount === 0;
    if ((mode === 'FREE' && alreadyFree) || (mode === 'PAID' && !alreadyFree)) return;

    await persistCompanyAmount(
      company,
      mode === 'FREE' ? 0 : null,
      mode === 'FREE'
        ? `${company.companyName} est maintenant en mode gratuit.`
        : `Le tarif calculé est rétabli pour ${company.companyName}.`,
    );
  };

  return (
    <section className="card-surface overflow-hidden rounded-2xl" data-testid="section-subscription-pricing">
      <div className="border-b border-[hsl(var(--border))] p-5 sm:p-6">
        <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Tarification MAXIMUS</p>
        <h2 className="mt-2 text-xl font-bold">Tarifs des modules et ajustement par entreprise</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Choisissez pour chaque entreprise le mode gratuit (0 FCFA) ou payant. En mode payant, le montant est calculé à partir des modules actifs;
          un prix personnalisé peut le remplacer. Laissez le champ vide pour revenir au calcul.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="m-5 rounded-lg border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]">
          <p>{loadError}</p>
          <p className="mt-1 text-xs">Les modules publiés restent affichés, mais les tarifs enregistrés et les montants par entreprise ne sont pas disponibles.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRetry(value => value + 1);
            }}
            className="mt-2 inline-flex items-center gap-2 text-xs font-bold underline underline-offset-4"
          >
            <RefreshCw size={13} /> Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <p role="status" className="p-6 text-sm text-[hsl(var(--muted-foreground))]">Chargement des tarifs…</p>
      ) : (
        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-bold">Grille mensuelle par module</h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Ces tarifs déterminent le montant calculé pour chaque entreprise. Un tarif manquant empêche le calcul complet.</p>
            {modules.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                Aucun module publié à tarifer.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))]">
                {modules.map(module => {
                const key = `module:${module.id}`;
                const value = moduleDrafts[module.id] ?? (module.monthlyAmount === null ? '' : String(module.monthlyAmount));
                const amount = parseAmount(value);
                return (
                  <div key={module.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,.7fr)_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold">{module.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Tarif actuel : {amountText(module.monthlyAmount)} / mois</p>
                    </div>
                    <label className="text-xs font-semibold">
                      Prix mensuel (FCFA)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={value}
                        disabled={loading || loadError !== ''}
                        onChange={event => setModuleDrafts(previous => ({ ...previous, [module.id]: event.target.value }))}
                        aria-label={`Prix mensuel du module ${module.name}`}
                        className="mt-1.5 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))]"
                      />
                    </label>
                    <ActionButton
                      primary
                      icon={Check}
                      testId={`button-save-module-price-${module.id}`}
                      disabled={!amount.valid || savingKeys[key] === true || loadError !== ''}
                      loading={savingKeys[key] === true}
                      onClick={() => saveModule(module)}
                    >
                      Enregistrer
                    </ActionButton>
                  </div>
                );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-sm font-bold">Montant final par entreprise</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Le montant calculé peut être modifié pour une entreprise; vide signifie « utiliser le montant calculé ».</p>
              </div>
              <label className="relative block sm:w-72">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Rechercher une entreprise…"
                  aria-label="Rechercher une entreprise"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
                />
              </label>
            </div>
            {loadError ? (
              <p className="mt-4 rounded-xl border border-dashed border-[hsl(var(--border))] p-5 text-sm text-[hsl(var(--muted-foreground))]">
                Les entreprises et leurs montants seront affichés lorsque l’API de facturation sera disponible.
              </p>
            ) : visibleCompanies.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-[hsl(var(--border))] p-5 text-sm text-[hsl(var(--muted-foreground))]">
                Aucune entreprise ne correspond à cette recherche.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))]">
                {visibleCompanies.map(company => {
                  const key = `company:${company.companyId}`;
                  const value = companyDrafts[company.companyId]
                    ?? (company.customAmount === null ? '' : String(company.customAmount));
                  const amount = parseAmount(value);
                  return (
                      <article key={company.companyId} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(190px,.55fr)_minmax(220px,.7fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-bold">{company.companyName}</h4>
                            <StatusBadge status={company.customAmount === 0 ? 'GRATUIT' : 'PAYANT'} />
                        </div>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {company.modules.length} module(s) actif(s)
                        </p>
                        <p className="mt-1 text-xs font-semibold">
                          Montant mensuel : <span className="text-[hsl(var(--primary))]">{amountText(company.payableAmount)}</span>
                        </p>
                      </div>
                      <label className="text-xs font-semibold">
                        Mode de facturation
                        <select
                          value={company.customAmount === 0 ? 'FREE' : 'PAID'}
                          onChange={event => {
                            const mode = event.target.value === 'FREE' ? 'FREE' : 'PAID';
                            void setCompanyBillingMode(company, mode);
                          }}
                          aria-label={`Mode de facturation de ${company.companyName}`}
                          disabled={loadError !== '' || savingKeys[key] === true}
                          className="mt-1.5 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="FREE">Gratuit · 0 FCFA</option>
                          <option value="PAID">Payant · tarif calculé ou personnalisé</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold">
                        Prix mensuel personnalisé (FCFA)
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={value}
                          disabled={loading || loadError !== ''}
                          onChange={event => setCompanyDrafts(previous => ({ ...previous, [company.companyId]: event.target.value }))}
                          aria-label={`Prix mensuel personnalisé pour ${company.companyName}`}
                          placeholder={company.moduleTotalComplete
                            ? `Calculé : ${company.moduleTotal}`
                            : 'Tarifs de module incomplets'}
                          className="mt-1.5 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))]"
                        />
                      </label>
                      <ActionButton
                        primary
                        icon={Check}
                        testId={`button-save-company-subscription-price-${company.companyId}`}
                        disabled={!amount.valid || savingKeys[key] === true || loadError !== ''}
                        loading={savingKeys[key] === true}
                        onClick={() => saveCompany(company)}
                      >
                        Enregistrer
                      </ActionButton>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}