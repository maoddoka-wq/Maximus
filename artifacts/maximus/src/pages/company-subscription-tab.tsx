import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { ActionButton } from '@workspace/maximus-design-system/components/ui/action-button';
import { StatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';
import {
  createCompanySubscriptionPayment,
  loadCompanySubscription,
  refreshCompanySubscriptionPayment,
  type CompanySubscriptionBilling,
  type SubscriptionPayment,
} from '@/lib/subscription-billing-api';
import type { Company } from '@/lib/store';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';

function amountText(amount: number | null) {
  if (amount === null) return 'À définir';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

function paymentStatusLabel(status: SubscriptionPayment['status']) {
  if (status === 'PAID') return 'PAYÉE';
  if (status === 'FAILED') return 'IMPAYÉ';
  return 'EN ATTENTE';
}

function dateText(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

export function CompanySubscriptionTab({ company }: { company: Company }) {
  const [billing, setBilling] = useState<CompanySubscriptionBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [refreshingPaymentId, setRefreshingPaymentId] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadCompanySubscription()
      .then(result => {
        if (cancelled) return;
        if (result.companyId !== company.id) {
          throw new Error('Les informations de facturation reçues ne correspondent pas à cette entreprise.');
        }
        setBilling(result);
        setLoadError('');
      })
      .catch(error => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Les informations d’abonnement sont indisponibles.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company.id, retry]);

  const pendingPaymentId = billing?.payments.find(payment => payment.status === 'PENDING')?.id ?? '';
  useEffect(() => {
    if (!pendingPaymentId) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const updated = await refreshCompanySubscriptionPayment(pendingPaymentId);
        if (cancelled) return;
        setBilling(current => current
          ? { ...current, payments: current.payments.map(payment => payment.id === updated.id ? updated : payment) }
          : current);
        if (updated.status === 'PAID') showAppToast('Paiement de l’abonnement confirmé.', 'success');
      } catch {
        // Keep the pending status visible; the user can retry manually.
      }
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingPaymentId]);

  const startPayment = async () => {
    if (!billing) return;
    setSavingPayment(true);
    try {
      const payment = await createCompanySubscriptionPayment(window.location.href);
      setBilling(current => current
        ? { ...current, payments: [payment, ...current.payments.filter(entry => entry.id !== payment.id)].slice(0, 10) }
        : current);
      if (!payment.checkoutUrl) {
        throw new Error('DiamanoPay n’a pas fourni de lien de paiement.');
      }
      window.location.assign(payment.checkoutUrl);
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le paiement n’a pas pu être démarré.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  const refreshPayment = async (payment: SubscriptionPayment) => {
    setRefreshingPaymentId(payment.id);
    try {
      const updated = await refreshCompanySubscriptionPayment(payment.id);
      setBilling(current => current
        ? { ...current, payments: current.payments.map(entry => entry.id === updated.id ? updated : entry) }
        : current);
      showAppToast(
        updated.status === 'PAID'
          ? 'Paiement confirmé.'
          : updated.status === 'FAILED'
            ? 'Le paiement a échoué. Vous pouvez réessayer.'
            : 'Le paiement est toujours en attente de confirmation.',
        updated.status === 'PAID' ? 'success' : updated.status === 'FAILED' ? 'error' : 'warning',
      );
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'La vérification du paiement a échoué.', 'error');
    } finally {
      setRefreshingPaymentId('');
    }
  };

  if (loading) {
    return <div className="card-surface rounded-2xl p-6 text-sm text-[hsl(var(--muted-foreground))]" role="status">Chargement de l’abonnement…</div>;
  }

  if (loadError || !billing) {
    return (
      <div className="card-surface rounded-2xl p-5" role="alert">
        <p className="text-sm text-[hsl(var(--destructive))]">{loadError || 'Les informations d’abonnement sont indisponibles.'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRetry(value => value + 1);
          }}
          className="mt-3 inline-flex items-center gap-2 text-xs font-bold underline underline-offset-4"
        >
          <RefreshCw size={13} /> Réessayer
        </button>
      </div>
    );
  }

  const latestPayment = billing.payments[0];

  return (
    <div className="space-y-5" data-testid="company-subscription-tab">
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Abonnement mensuel</p>
            <h2 className="mt-2 text-xl font-bold">Tarifs et paiement</h2>
            <p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
              Le montant automatique, le détail des modules et le prix personnalisé défini par MAXIMUS restent visibles.
            </p>
          </div>
          <StatusBadge status={latestPayment?.status === 'PAID' ? 'PAYÉE' : latestPayment?.status === 'FAILED' ? 'IMPAYÉ' : latestPayment?.status === 'PENDING' ? 'EN ATTENTE' : billing.customAmount === null ? 'ACTIF' : 'PERSONNALISÉ'} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.24)] p-4">
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Forfait automatique · {billing.autoPlan.name}</p>
            <p className="mt-1 text-lg font-bold">{amountText(billing.autoPlan.monthlyAmount)} <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">/ mois</span></p>
          </div>
          <div className="rounded-xl border border-[hsl(var(--primary)/.28)] bg-[hsl(var(--primary)/.06)] p-4">
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              {billing.customAmount === null ? 'Montant mensuel à payer' : 'Prix personnalisé fixé par MAXIMUS'}
            </p>
            <p className="mt-1 text-lg font-bold text-[hsl(var(--primary))]">
              {amountText(billing.payableAmount)} <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">/ mois</span>
            </p>
            {billing.customAmount !== null && (
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Le prix personnalisé remplace le forfait automatique pour le paiement.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Détail des modules actifs</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Tarifs mensuels renseignés par MAXIMUS.</p>
            </div>
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{billing.modules.length} module(s)</span>
          </div>
          {billing.modules.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
              Aucun module actif n’est associé à cette entreprise.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))]">
              {billing.modules.map(module => (
                <div key={module.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{module.name}</span>
                  <span className="shrink-0 font-semibold">{amountText(module.monthlyAmount)} <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">/ mois</span></span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 bg-[hsl(var(--muted)/.24)] px-4 py-3 text-sm font-bold">
                <span>Total des modules</span>
                <span>{billing.moduleTotalComplete ? amountText(billing.moduleTotal) : 'Tarif incomplet'}</span>
              </div>
            </div>
          )}
          {!billing.moduleTotalComplete && billing.modules.length > 0 && (
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              Le total des modules sera calculé après la définition des tarifs manquants; le forfait automatique reste affiché séparément.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Paiement ponctuel par DiamanoPay</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Le paiement mensuel doit être relancé à chaque échéance; le renouvellement automatique n’est pas activé.
            </p>
            {!billing.paymentReady && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">Le paiement n’est pas encore configuré.</p>}
          </div>
          <ActionButton
            primary
            icon={CreditCard}
            testId="button-pay-subscription"
            disabled={!billing.paymentReady || billing.payableAmount <= 0 || savingPayment}
            loading={savingPayment}
            onClick={startPayment}
          >
            Payer {amountText(billing.payableAmount)}
          </ActionButton>
        </div>
      </section>

      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="border-b border-[hsl(var(--border))] p-5">
          <h3 className="text-sm font-bold">Historique des paiements</h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Un paiement est confirmé uniquement après la réponse vérifiée de DiamanoPay.</p>
        </div>
        {billing.payments.length === 0 ? (
          <p className="p-5 text-sm text-[hsl(var(--muted-foreground))]">Aucun paiement enregistré.</p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {billing.payments.map(payment => (
              <div key={payment.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{payment.reference}</strong>
                    <StatusBadge status={paymentStatusLabel(payment.status)} />
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {amountText(payment.amount)} · {dateText(payment.paidAt ?? payment.createdAt)}
                  </p>
                  {payment.failureReason && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{payment.failureReason}</p>}
                </div>
                {payment.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2">
                    {payment.checkoutUrl && (
                      <a
                        href={payment.checkoutUrl}
                        data-testid={`link-resume-subscription-payment-${payment.id}`}
                        className="inline-flex items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]"
                      >
                        Reprendre le paiement
                      </a>
                    )}
                    <ActionButton
                      icon={RefreshCw}
                      testId={`button-refresh-subscription-payment-${payment.id}`}
                      disabled={refreshingPaymentId === payment.id}
                      loading={refreshingPaymentId === payment.id}
                      onClick={() => refreshPayment(payment)}
                    >
                      Vérifier
                    </ActionButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}