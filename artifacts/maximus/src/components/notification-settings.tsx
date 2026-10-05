import { useEffect, useState } from 'react';

import { Button } from '@workspace/maximus-design-system/components/ui/button';
import {
  decodeVapidPublicKey,
  maximusPushApi,
} from '@/lib/notification-push-api';
import { isIosDevice, isStandalonePwa, registerMaximusPushServiceWorker } from '@/lib/pwa';
import {
  isNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
} from '@/lib/notification-sound';

function pushSupportMessage(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) return 'Les notifications nécessitent une connexion HTTPS sécurisée.';
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
    return 'Ce navigateur ne prend pas en charge les notifications système.';
  }
  if (isIosDevice() && !isStandalonePwa()) {
    return 'Sur iPhone ou iPad, installez MAXIMUS sur l’écran d’accueil avant d’activer les notifications.';
  }
  return null;
}

export function NotificationSettings() {
  const [soundEnabled, setSoundEnabled] = useState(isNotificationSoundEnabled);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushAccessAllowed, setPushAccessAllowed] = useState<boolean | null>(null);
  const [pushAccessError, setPushAccessError] = useState('');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const unsupportedMessage = pushSupportMessage();

  useEffect(() => {
    let cancelled = false;
    void maximusPushApi.access()
      .then(({ allowed }) => {
        if (!cancelled) setPushAccessAllowed(allowed);
      })
      .catch(() => {
        if (!cancelled) {
          setPushAccessAllowed(false);
          setPushAccessError('Impossible de vérifier l’autorisation MAXIMUS. Réessayez plus tard.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (unsupportedMessage || typeof Notification === 'undefined') {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);
    if (Notification.permission !== 'granted') return;

    let cancelled = false;
    void navigator.serviceWorker
      .getRegistration(new URL(import.meta.env.BASE_URL, window.location.origin).href)
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setPushEnabled(Boolean(subscription));
      })
      .catch(() => {
        if (!cancelled) setPushEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [unsupportedMessage]);

  const enablePush = async () => {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      if (pushAccessAllowed !== true) {
        throw new Error(
          pushAccessError || 'MAXIMUS doit autoriser les notifications push de votre entreprise avant leur activation.',
        );
      }

      const supportError = pushSupportMessage();
      if (supportError) throw new Error(supportError);

      // Ask before awaiting the network so the browser still recognizes the user gesture.
      const nextPermission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        throw new Error('Autorisez les notifications dans votre navigateur pour recevoir les alertes.');
      }

      const { publicKey } = await maximusPushApi.publicKey();
      const registration = await registerMaximusPushServiceWorker();
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(publicKey),
        });

      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys.auth) {
        throw new Error('Le navigateur n’a pas fourni les informations nécessaires à l’abonnement.');
      }
      await maximusPushApi.subscribe({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
      });
      setPushEnabled(true);
      setMessage('Les notifications système sont activées sur cet appareil.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’activer les notifications.');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const scope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
      const registration = await navigator.serviceWorker.getRegistration(scope);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await maximusPushApi.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
      setMessage('Les notifications système sont désactivées sur cet appareil.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de désactiver les notifications.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSound = async () => {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    setNotificationSoundEnabled(nextEnabled);
    setError('');

    if (nextEnabled && !await playNotificationSound(true)) {
      setError('Le navigateur n’a pas pu démarrer le son. Vérifiez ses réglages audio.');
    }
  };

  return (
    <section className="card-surface rounded-2xl p-5" aria-labelledby="notification-settings-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="notification-settings-title" className="font-bold">Alertes sur cet appareil</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Choisissez si MAXIMUS peut émettre un son dans l’application et afficher des alertes système en arrière-plan.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-[hsl(var(--muted))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Son dans MAXIMUS</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {soundEnabled ? 'Un son accompagne les nouvelles alertes.' : 'Le son est désactivé.'}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void toggleSound()}>
              {soundEnabled ? 'Désactiver' : 'Activer le son'}
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-[hsl(var(--muted))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Notifications hors application</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {unsupportedMessage
                  ?? (pushAccessAllowed === null
                    ? 'Vérification de l’autorisation MAXIMUS…'
                    : pushAccessError
                      || (!pushAccessAllowed
                        ? 'MAXIMUS n’a pas autorisé les notifications push pour cette entreprise. Le son local reste disponible.'
                        : pushEnabled
                          ? 'Activées pour ce navigateur.'
                          : permission === 'denied'
                            ? 'L’autorisation est refusée dans les réglages du navigateur.'
                            : 'Autorisez les notifications pour recevoir un message lorsque MAXIMUS est fermé.'))}
              </p>
            </div>
            <Button
              type="button"
              variant={pushEnabled ? 'secondary' : 'outline'}
              size="sm"
              disabled={
                busy
                || Boolean(unsupportedMessage)
                || permission === 'denied'
                || pushAccessAllowed === null
                || (!pushAccessAllowed && !pushEnabled)
              }
              onClick={() => void (pushEnabled ? disablePush() : enablePush())}
            >
              {busy ? 'Patientez…' : pushEnabled ? 'Désactiver' : 'Activer'}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
        Le son d’une alerte système reste contrôlé par les réglages du navigateur et de l’appareil.
      </p>
      {(message || error) && (
        <p className={`mt-3 text-sm ${error ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`} role="status" aria-live="polite">
          {error || message}
        </p>
      )}
    </section>
  );
}
