import { useState } from 'react';
import { LockKeyhole, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { CompanySubscriptionTab } from './company-subscription-tab';

type SubscriptionAccessGateProps = {
  isCompanyAdmin: boolean;
  message: string;
  onRetryAccess: () => Promise<boolean>;
  onLogout: () => void;
};

export function SubscriptionAccessGate({
  isCompanyAdmin,
  message,
  onRetryAccess,
  onLogout,
}: SubscriptionAccessGateProps) {
  const [checkingAccess, setCheckingAccess] = useState(false);

  const retryAccess = async () => {
    setCheckingAccess(true);
    try {
      await onRetryAccess();
    } finally {
      setCheckingAccess(false);
    }
  };

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <section
          className="card-surface rounded-2xl border border-[hsl(var(--destructive)/.25)] p-5 sm:p-7"
          role="alert"
          data-testid="subscription-access-gate"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-[hsl(var(--destructive))]">
              <LockKeyhole size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--destructive))]">
                Accès suspendu
              </p>
              <h1 className="mt-2 text-xl font-bold">
                {isCompanyAdmin ? 'Régularisez l’abonnement de votre entreprise' : 'L’abonnement de votre entreprise doit être régularisé'}
              </h1>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                {message}
              </p>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                {isCompanyAdmin
                  ? 'Les services de l’entreprise seront rétablis dès que le paiement sera confirmé.'
                  : 'Contactez l’administrateur de votre entreprise pour qu’il règle l’abonnement.'}
              </p>
              {!isCompanyAdmin && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => void retryAccess()}
                    disabled={checkingAccess}
                    data-testid="button-retry-subscription-access"
                  >
                    <RefreshCw size={16} className={checkingAccess ? 'animate-spin' : ''} />
                    Vérifier à nouveau
                  </Button>
                  <Button type="button" size="lg" variant="outline" onClick={onLogout} data-testid="button-logout-subscription-gate">
                    <LogOut size={16} />
                    Se déconnecter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {isCompanyAdmin && (
          <>
            <CompanySubscriptionTab />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => void retryAccess()}
                disabled={checkingAccess}
                data-testid="button-retry-subscription-access"
              >
                <RefreshCw size={16} className={checkingAccess ? 'animate-spin' : ''} />
                Vérifier le paiement et rétablir l’accès
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={onLogout} data-testid="button-logout-subscription-gate">
                <LogOut size={16} />
                Se déconnecter
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}