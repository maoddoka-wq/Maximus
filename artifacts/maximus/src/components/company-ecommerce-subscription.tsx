import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CalendarDays, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSearch } from 'wouter';
import { Alert, AlertDescription, AlertTitle } from '@workspace/maximus-design-system/components/ui/alert';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/maximus-design-system/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@workspace/maximus-design-system/components/ui/radio-group';
import { Skeleton } from '@workspace/maximus-design-system/components/ui/skeleton';
import { StatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';
import {
  createCompanyEcommerceCheckout,
  loadCompanyEcommerceSubscription,
  type CompanyEcommerceSubscriptionDetails,
  type CompanyEcommerceSubscriptionState,
  type EcommercePayment,
  type EcommercePaymentProvider,
} from '@/lib/ecommerce-subscription-api';

const subscriptionQueryKey = (companyId: string) => ['company-ecommerce-subscription', companyId] as const;

function formatMoney(value: number | null) {
  if (value === null) return 'Tarif à confirmer';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;
}

function formatDate(value: string | null) {
  if (!value) return 'Aucune échéance enregistrée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date indisponible';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function subscriptionStateLabel(status: CompanyEcommerceSubscriptionState) {
  const labels: Record<CompanyEcommerceSubscriptionState, string> = {
    NOT_MANAGED: 'Non géré',
    UNAVAILABLE: 'Indisponible',
    PAYMENT_REQUIRED: 'Paiement requis',
    ACTIVE: 'Actif',
    EXPIRED: 'Expiré',
  };
  return labels[status];
}

function moduleStateLabel(status: CompanyEcommerceSubscriptionDetails['moduleStatus']) {
  const labels = {
    ACTIF: 'Actif',
    BETA: 'Bêta',
    MAINTENANCE: 'Maintenance',
    INACTIF: 'Inactif',
  };
  return labels[status];
}

function paymentStatusLabel(payment: EcommercePayment) {
  const labels = {
    CREATING: 'Création du paiement',
    PENDING: 'En attente de confirmation',
    PAID: 'Paiement confirmé',
    FAILED: 'Paiement échoué',
  };
  return labels[payment.status];
}

function useCompanySubscription(companyId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionQueryKey(companyId),
    queryFn: loadCompanyEcommerceSubscription,
    enabled: Boolean(companyId) && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: query => (
      query.state.data?.payment?.status === 'PENDING'
      || query.state.data?.payment?.status === 'CREATING'
        ? 30_000
        : false
    ),
  });
}

export function EcommerceSubscriptionReminder({
  companyAdmin,
  companyId,
  onNavigate,
}: {
  companyAdmin: boolean;
  companyId: string;
  onNavigate: (path: string) => void;
}) {
  const subscriptionQuery = useCompanySubscription(companyId, companyAdmin);
  if (!companyAdmin) return null;
  if (subscriptionQuery.isLoading) {
    return (
      <section aria-label="Statut de l’abonnement E-commerce" className="space-y-2" data-testid="subscription-reminder-loading">
        <Skeleton className="h-24 w-full rounded-xl" />
      </section>
    );
  }
  if (subscriptionQuery.isError) {
    return (
      <Alert variant="destructive" className="mb-5" data-testid="subscription-reminder-error">
        <AlertCircle size={16} />
        <div>
          <AlertTitle>Statut E-commerce non vérifié</AlertTitle>
          <AlertDescription className="mt-1">
            {subscriptionQuery.error instanceof Error
              ? subscriptionQuery.error.message
              : 'Impossible de vérifier le statut de l’abonnement.'}
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            data-testid="button-retry-subscription-reminder"
            onClick={() => void subscriptionQuery.refetch()}
          >
            <RefreshCw size={14} /> Réessayer
          </Button>
        </div>
      </Alert>
    );
  }
  const subscription = subscriptionQuery.data;
  if (!subscription?.required || !['PAYMENT_REQUIRED', 'EXPIRED'].includes(subscription.status)) return null;

  return (
    <Alert variant="destructive" className="mb-5" data-testid="subscription-ecommerce-reminder">
      <AlertCircle size={16} />
      <div className="flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <AlertTitle>
            {subscription.status === 'EXPIRED'
              ? 'L’abonnement E-commerce a expiré'
              : 'Un paiement est requis pour E-commerce'}
          </AlertTitle>
          <AlertDescription className="mt-1">
            L’accès à la boutique est suspendu tant que le paiement n’a pas été confirmé.
            Vous pouvez ouvrir la page d’abonnement même si le module est masqué dans la navigation.
          </AlertDescription>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="shrink-0"
          data-testid="button-open-ecommerce-subscription"
          onClick={() => onNavigate('/entreprise/abonnement')}
        >
          Régulariser l’abonnement <ArrowRight size={15} />
        </Button>
      </div>
    </Alert>
  );
}

export function CompanyEcommerceSubscriptionPage({
  companyId,
  companyAdmin,
}: {
  companyId: string;
  companyAdmin: boolean;
}) {
  const search = useSearch();
  const queryClient = useQueryClient();
  const queryKey = subscriptionQueryKey(companyId);
  const subscriptionQuery = useCompanySubscription(companyId, companyAdmin);
  const refetchSubscription = subscriptionQuery.refetch;
  const [provider, setProvider] = useState<EcommercePaymentProvider>('WAVE');
  const [checkoutPayment, setCheckoutPayment] = useState<EcommercePayment | null>(null);
  const checkoutMutation = useMutation({
    mutationFn: createCompanyEcommerceCheckout,
    onSuccess: (payment) => {
      setCheckoutPayment(payment);
      queryClient.setQueryData<CompanyEcommerceSubscriptionDetails | undefined>(queryKey, (current) =>
        current ? { ...current, payment } : current,
      );
    },
  });

  useEffect(() => {
    if (new URLSearchParams(search).get('checkout') === 'return') {
      void refetchSubscription();
    }
  }, [search, refetchSubscription]);

  if (!companyAdmin) {
    return (
      <Alert variant="destructive" data-testid="subscription-admin-only">
        <AlertCircle size={16} />
        <div>
          <AlertTitle>Accès réservé à l’administrateur de l’entreprise</AlertTitle>
          <AlertDescription>Seul l’administrateur de votre entreprise peut consulter et régler cet abonnement.</AlertDescription>
        </div>
      </Alert>
    );
  }

  const beginCheckout = async () => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('checkout', 'return');
    const payment = await checkoutMutation.mutateAsync({ provider, redirectUrl: returnUrl.toString() });
    if (payment.checkoutUrl) window.location.assign(payment.checkoutUrl);
  };

  if (subscriptionQuery.isLoading) {
    return (
      <div className="space-y-4" data-testid="company-subscription-loading" role="status" aria-label="Chargement de l’abonnement">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (subscriptionQuery.isError || !subscriptionQuery.data) {
    return (
      <Alert variant="destructive" data-testid="company-subscription-load-error">
        <AlertCircle size={16} />
        <div>
          <AlertTitle>Impossible de charger l’abonnement</AlertTitle>
          <AlertDescription className="mt-1">
            {subscriptionQuery.error instanceof Error
              ? subscriptionQuery.error.message
              : 'Le statut de l’abonnement E-commerce est indisponible.'}
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            data-testid="button-retry-company-subscription"
            onClick={() => void subscriptionQuery.refetch()}
          >
            <RefreshCw size={14} /> Réessayer
          </Button>
        </div>
      </Alert>
    );
  }

  const subscription = subscriptionQuery.data;
  const payment = checkoutPayment ?? subscription.payment;
  const canCheckout = subscription.required
    && ['ACTIVE', 'PAYMENT_REQUIRED', 'EXPIRED'].includes(subscription.status);
  const remainingLabel = subscription.daysRemaining === null
    ? 'Durée restante non renseignée'
    : subscription.daysRemaining > 0
      ? `${subscription.daysRemaining} jour${subscription.daysRemaining > 1 ? 's' : ''} restant${subscription.daysRemaining > 1 ? 's' : ''}`
      : subscription.daysRemaining === 0
        ? 'Échu'
        : `Échu depuis ${Math.abs(subscription.daysRemaining)} jour${Math.abs(subscription.daysRemaining) > 1 ? 's' : ''}`;

  return (
    <div className="space-y-5" data-testid="company-ecommerce-subscription-page">
      {subscription.status === 'PAYMENT_REQUIRED' || subscription.status === 'EXPIRED' ? (
        <Alert variant="destructive" data-testid="company-subscription-action-required">
          <AlertCircle size={16} />
          <div>
            <AlertTitle>{subscription.status === 'EXPIRED' ? 'Accès suspendu : abonnement expiré' : 'Paiement requis pour activer l’accès'}</AlertTitle>
            <AlertDescription className="mt-1">
              Le paiement est vérifié par le prestataire avant l’activation ou le renouvellement de l’accès.
              Une fois confirmé, le statut et la date de couverture sont mis à jour après vérification côté MAXIMUS.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-[hsl(var(--card)/.72)]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Espace entreprise</p>
              <CardTitle className="mt-2 text-xl">Abonnement E-commerce</CardTitle>
              <CardDescription className="mt-2 max-w-2xl leading-5">
                Consultez votre échéance et réglez le tarif mensuel configuré. La configuration d’accès du module est gérée séparément par MAXIMUS.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="button-refresh-company-subscription"
              disabled={subscriptionQuery.isFetching}
              onClick={() => void subscriptionQuery.refetch()}
            >
              <RefreshCw size={14} className={subscriptionQuery.isFetching ? 'animate-spin' : ''} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="rounded-xl border p-4" data-testid="subscription-access-summary">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">État de l’abonnement</span>
              <StatusBadge status={subscription.status === 'PAYMENT_REQUIRED' ? 'IMPAYÉ' : subscriptionStateLabel(subscription.status).toUpperCase()} />
            </div>
            <p className="mt-3 text-2xl font-bold">{remainingLabel}</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Jusqu’au {formatDate(subscription.paidThroughAt)}
            </p>
            <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-[hsl(var(--muted-foreground))]">
              <CalendarDays size={15} />
              <span>Tarif mensuel configuré : <strong className="text-[hsl(var(--foreground))]">{formatMoney(subscription.monthlyAmount)}</strong></span>
            </div>
          </div>

          <div className="rounded-xl border p-4" data-testid="subscription-module-configuration">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[hsl(var(--primary))]" />
              <h2 className="text-sm font-bold">Configuration du module</h2>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Accès configuré</span>
              <StatusBadge status={subscription.moduleStatus} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Le paiement couvre l’abonnement de l’entreprise. Il ne modifie pas la disponibilité du module configurée par MAXIMUS.
              État du module : {moduleStateLabel(subscription.moduleStatus)}.
            </p>
          </div>
        </CardContent>
      </Card>

      {canCheckout ? (
        <Card data-testid="company-subscription-checkout">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard size={17} /> Paiement et renouvellement</CardTitle>
            <CardDescription>
              Le montant de l’échéance est confirmé côté serveur avant l’ouverture du paiement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={provider}
              onValueChange={(value) => setProvider(value as EcommercePaymentProvider)}
              aria-label="Choisir un moyen de paiement"
              className="grid gap-3 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="WAVE" data-testid="radio-provider-wave" />
                <span><strong className="block">Wave</strong><span className="text-xs text-[hsl(var(--muted-foreground))]">Paiement mobile</span></span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="ORANGE_MONEY" data-testid="radio-provider-orange-money" />
                <span><strong className="block">Orange Money</strong><span className="text-xs text-[hsl(var(--muted-foreground))]">Paiement mobile</span></span>
              </label>
            </RadioGroup>
            {checkoutMutation.isError && (
              <Alert variant="destructive" data-testid="company-subscription-checkout-error">
                <AlertCircle size={16} />
                <div>
                  <AlertTitle>Le paiement n’a pas pu être préparé</AlertTitle>
                  <AlertDescription>{checkoutMutation.error instanceof Error ? checkoutMutation.error.message : 'Réessayez dans un instant.'}</AlertDescription>
                </div>
              </Alert>
            )}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                L’accès est activé uniquement après vérification et confirmation du paiement. La date de couverture est ensuite actualisée depuis le statut renvoyé par MAXIMUS.
              </p>
              <Button
                type="button"
                data-testid="button-start-ecommerce-checkout"
                disabled={checkoutMutation.isPending}
                onClick={() => void beginCheckout().catch(() => undefined)}
              >
                {checkoutMutation.isPending ? 'Préparation…' : subscription.status === 'ACTIVE' ? 'Renouveler l’abonnement' : 'Procéder au paiement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="company-subscription-unavailable">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertCircle size={18} className="mt-0.5 text-[hsl(var(--muted-foreground))]" />
            <div>
              <h2 className="text-sm font-bold">{subscription.status === 'NOT_MANAGED' ? 'Abonnement non géré en ligne' : 'Paiement indisponible'}</h2>
              <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                {subscription.status === 'NOT_MANAGED'
                  ? 'Aucun paiement E-commerce n’est requis ou configuré pour cette entreprise.'
                  : 'Le paiement ne peut pas être lancé actuellement. Contactez MAXIMUS si cette situation persiste.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {payment && (
        <Card data-testid="company-subscription-payment-status">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dernier paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{paymentStatusLabel(payment)}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Référence {payment.reference} · {payment.provider === 'WAVE' ? 'Wave' : 'Orange Money'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">{formatMoney(payment.amount)}</span>
                <StatusBadge status={payment.status === 'PAID' ? 'PAYÉE' : payment.status === 'FAILED' ? 'ÉCHOUÉ' : 'EN ATTENTE'} />
                {payment.checkoutUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="button-resume-ecommerce-payment"
                    onClick={() => window.location.assign(payment.checkoutUrl!)}
                  >
                    Reprendre le paiement
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Si le paiement vient d’être effectué, actualisez le statut après le retour du prestataire. Seule la confirmation vérifiée active l’accès.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}