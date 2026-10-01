import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/maximus-design-system/components/ui/alert';
import { loadCompanySubscriptionStatus } from '@/lib/subscription-billing-api';
import { shouldShowSubscriptionExpiryWarning } from '@/lib/subscription-countdown';

type CompanySubscriptionExpiryNoticeProps = {
  companyId: string;
  isCompanyAdmin: boolean;
  onNavigate: (path: string) => void;
};

const expiryDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export function CompanySubscriptionExpiryNotice({
  companyId,
  isCompanyAdmin,
  onNavigate,
}: CompanySubscriptionExpiryNoticeProps) {
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof loadCompanySubscriptionStatus>>['subscription'] | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const refreshStatus = async () => {
      try {
        const response = await loadCompanySubscriptionStatus();
        if (active && response.companyId === companyId) {
          setSubscription(response.subscription);
        }
      } catch {
        // The main subscription gate still protects access if this optional notice cannot load.
      }
    };

    void refreshStatus();
    const refreshInterval = window.setInterval(() => void refreshStatus(), 30_000);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, [companyId]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(clockInterval);
  }, []);

  const endsAt = subscription?.currentPeriodEndsAt ?? null;
  const showNotice =
    subscription?.billingMode === 'PAID'
    && subscription.status === 'ACTIVE'
    && shouldShowSubscriptionExpiryWarning(endsAt, nowMs);

  if (!showNotice || !endsAt) return null;

  const expiryDate = new Date(endsAt);
  const formattedExpiry = Number.isNaN(expiryDate.getTime())
    ? 'la date de fin de votre période'
    : expiryDateFormatter.format(expiryDate);
  const message = isCompanyAdmin
    ? `Votre abonnement expire dans moins de 48 heures, le ${formattedExpiry}. Renouvelez-le depuis l’onglet Abonnement avant cette date pour éviter une interruption de l’espace entreprise.`
    : `L’abonnement de votre entreprise expire dans moins de 48 heures, le ${formattedExpiry}. Prévenez votre administrateur dès maintenant pour éviter une interruption de votre accès.`;

  return (
    <Alert
      role="status"
      aria-live="polite"
      data-testid="company-subscription-expiry-notice"
      className="mb-5 border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.09)] text-[hsl(var(--foreground))]"
    >
      <Clock3 aria-hidden="true" className="h-4 w-4 text-[hsl(var(--primary))]" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AlertTitle className="font-semibold">Votre abonnement arrive à échéance</AlertTitle>
          <AlertDescription className="leading-5 text-[hsl(var(--muted-foreground))]">
            {message}
          </AlertDescription>
        </div>
        {isCompanyAdmin && (
          <button
            type="button"
            onClick={() => onNavigate('/entreprise/organisation?tab=subscription')}
            className="shrink-0 self-start rounded-lg border border-[hsl(var(--primary)/.4)] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] transition hover:bg-[hsl(var(--primary)/.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] sm:self-center"
          >
            Ouvrir l’abonnement
          </button>
        )}
      </div>
    </Alert>
  );
}