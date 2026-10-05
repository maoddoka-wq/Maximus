import { requestJson } from '@/lib/api-request';
import { isIosDevice, isStandalonePwa, registerMaximusPushServiceWorker } from '@/lib/pwa';

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export const maximusPushApi = {
  access: () => requestJson<{ allowed: boolean }>('/notifications/push/access'),
  publicKey: () => requestJson<{ publicKey: string }>('/notifications/push/public-key'),
  subscribe: (subscription: PushSubscriptionPayload) =>
    requestJson<{ ok: true }>('/notifications/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
  unsubscribe: (endpoint: string) =>
    requestJson<{ ok: true }>('/notifications/push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }),
};

export function getPushSupportMessage(): string | null {
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

export async function hasCurrentBrowserPushSubscription(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;

  const scope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const registration = await navigator.serviceWorker.getRegistration(scope);
  return Boolean(await registration?.pushManager.getSubscription());
}

export async function subscribeCurrentBrowserToPush(): Promise<void> {
  const supportError = getPushSupportMessage();
  if (supportError) throw new Error(supportError);

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') {
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
}

export async function disableCurrentBrowserPushSubscription() {
  if (!('serviceWorker' in navigator)) return;

  const scope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const registration = await navigator.serviceWorker.getRegistration(scope);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await maximusPushApi.unsubscribe(subscription.endpoint);
  } finally {
    await subscription.unsubscribe();
  }
}

export function decodeVapidPublicKey(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = window.atob(padded);
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return buffer;
}
