import { useEffect, useState } from 'react';
import type { Session } from '@/lib/navigation';
import {
  getCompanySubscriptionBillingMode,
  loadCompanySubscription,
  type CompanySubscriptionBillingMode,
} from '@/lib/subscription-billing-api';

type ResolvedBillingMode = {
  companyId: string;
  mode: CompanySubscriptionBillingMode;
};

export function useCompanySubscriptionBillingMode(session: Session | null) {
  const companyId = session?.startsWith('company:')
    && !session.startsWith('company:sector-test-')
    ? session.slice('company:'.length)
    : null;
  const [resolved, setResolved] = useState<ResolvedBillingMode | null>(null);

  useEffect(() => {
    if (!companyId) return undefined;

    let cancelled = false;
    let hasLoaded = false;
    const refresh = async () => {
      try {
        const billing = await loadCompanySubscription();
        if (billing.companyId !== companyId) {
          throw new Error('Les informations de facturation reçues ne correspondent pas à cette entreprise.');
        }
        if (cancelled) return;
        hasLoaded = true;
        setResolved({
          companyId,
          mode: getCompanySubscriptionBillingMode(billing.customAmount),
        });
      } catch {
        if (!cancelled && !hasLoaded) {
          setResolved(current => current?.companyId === companyId ? current : null);
        }
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [companyId]);

  return resolved?.companyId === companyId ? resolved.mode : null;
}