import { useEffect, useState } from 'react';

import { Button } from '@workspace/maximus-design-system/components/ui/button';
import {
  getPushSupportMessage,
  hasCurrentBrowserPushSubscription,
  maximusPushApi,
  subscribeCurrentBrowserToPush,
} from '@/lib/notification-push-api';
import { shouldShowCompanyPushPrompt } from '@/lib/company-push-prompt';

type Props = {
  companyId: string;
  companyName: string;
  placement: 'floating' | 'bell';
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

export function CompanyPushNotificationPrompt({ companyId, companyName, placement }: Props) {
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    placement === 'floating' && wasDismissed(companyId),
  );
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

  if (!shouldShowCompanyPushPrompt({
    supportError,
    accessAllowed,
    subscribed,
    dismissed,
    permission,
  })) {
    return null;
  }

  const isFloating = placement === 'floating';

  return (
    <section
      className={isFloating
        ? 'card-surface fixed inset-x-3 z-[60] mx-auto max-w-lg rounded-xl border border-[hsl(var(--primary)/.25)] p-3 sm:inset-x-auto sm:right-5 sm:w-[32rem] sm:max-w-[calc(100vw-2.5rem)]'
        : 'card-surface flex flex-col gap-3 rounded-xl border border-[hsl(var(--primary)/.25)] p-3 sm:flex-row sm:items-center sm:justify-between'}
      aria-labelledby="company-push-prompt-title"
      aria-live="polite"
      data-testid="company-push-authorization-prompt"
      data-placement={placement}
      style={isFloating ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' } : undefined}
    >
      <div className={isFloating ? 'min-w-0 sm:pr-3' : 'min-w-0'}>
        <h2 id="company-push-prompt-title" className="text-sm font-semibold">
          Autoriser les notifications ?
        </h2>
        <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          MAXIMUS peut envoyer des alertes à {companyName} lorsque l’application est en arrière-plan.
        </p>
        {permission === 'denied' && (
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            Le navigateur les bloque. Réactivez-les dans ses réglages, puis revenez ici.
          </p>
        )}
        {error && permission !== 'denied' && (
          <p className="mt-2 text-xs text-[hsl(var(--destructive))]" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className={`mt-3 flex shrink-0 items-center gap-2 ${isFloating ? '' : 'mt-0'}`}>
        {permission !== 'denied' && (
          <Button type="button" size="sm" disabled={busy} onClick={() => void enablePush()}>
            {busy ? 'Activation…' : 'Autoriser'}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDismissed(true);
            if (isFloating) {
              try {
                window.sessionStorage.setItem(dismissalKey(companyId), 'true');
              } catch {
                // The prompt remains dismissed for this mount if session storage is unavailable.
              }
            }
          }}
        >
          Plus tard
        </Button>
      </div>
    </section>
  );
}
