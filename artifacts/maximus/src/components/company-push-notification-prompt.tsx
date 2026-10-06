import { useEffect, useState } from 'react';

import { Button } from '@workspace/maximus-design-system/components/ui/button';
import {
  getPushSupportMessage,
  hasCurrentBrowserPushSubscription,
  maximusPushApi,
  subscribeCurrentBrowserToPush,
} from '@/lib/notification-push-api';

type Props = {
  companyId: string;
  companyName: string;
  onNavigate: (path: string) => void;
};

function dismissalKey(companyId: string) {
  return `maximus-push-prompt-dismissed:${companyId}`;
}

function wasDismissed(companyId: string) {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(dismissalKey(companyId)) === 'true';
  } catch {
    return false;
  }
}

export function CompanyPushNotificationPrompt({ companyId, companyName, onNavigate }: Props) {
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => wasDismissed(companyId));
  const [error, setError] = useState('');
  const supportError = getPushSupportMessage();

  useEffect(() => {
    if (getPushSupportMessage()) return;

    let cancelled = false;
    let checking = false;

    const refresh = async () => {
      if (checking) return;
      checking = true;
      try {
        const [{ allowed }, hasSubscription] = await Promise.all([
          maximusPushApi.access(),
          hasCurrentBrowserPushSubscription().catch(() => false),
        ]);
        if (!cancelled) {
          setAccessAllowed(allowed);
          setSubscribed(hasSubscription);
          setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
        }
      } catch {
        if (!cancelled) setAccessAllowed(null);
      } finally {
        checking = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    void refresh();
    const interval = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [companyId]);

  const enablePush = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // The browser permission prompt must be reached directly from this click.
      await subscribeCurrentBrowserToPush();
      setPermission(Notification.permission);
      setSubscribed(true);
    } catch (cause) {
      if (typeof Notification !== 'undefined') setPermission(Notification.permission);
      setError(cause instanceof Error ? cause.message : 'Impossible d’activer les notifications.');
    } finally {
      setBusy(false);
    }
  };

  if (
    supportError
    || accessAllowed !== true
    || subscribed
    || dismissed
    || permission === 'unsupported'
  ) {
    return null;
  }

  return (
    <section
      className="mb-5 rounded-2xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.06)] p-4 sm:p-5"
      aria-labelledby="company-push-prompt-title"
      data-testid="company-push-authorization-prompt"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="company-push-prompt-title" className="font-bold">
            Notifications disponibles pour {companyName}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            MAXIMUS a autorisé les notifications push pour votre entreprise. Autorisez-les sur cet appareil pour
            recevoir les alertes lorsque MAXIMUS est en arrière-plan. Chaque navigateur demande son propre accord.
          </p>
          {permission === 'denied' && (
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Le navigateur a bloqué cette autorisation. Ouvrez vos réglages de notifications pour voir comment la rétablir.
            </p>
          )}
          {error && permission !== 'denied' && (
            <p className="mt-2 text-sm text-[hsl(var(--destructive))]" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {permission === 'denied' ? (
            <Button type="button" variant="outline" onClick={() => onNavigate('/entreprise/profil')}>
              Voir les réglages
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void enablePush()}>
              {busy ? 'Activation…' : 'Autoriser sur cet appareil'}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDismissed(true);
              try {
                window.sessionStorage.setItem(dismissalKey(companyId), 'true');
              } catch {
                // The prompt remains dismissed for this mount if session storage is unavailable.
              }
            }}
          >
            Plus tard
          </Button>
        </div>
      </div>
    </section>
  );
}
