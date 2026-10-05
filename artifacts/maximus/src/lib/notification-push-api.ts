import { requestJson } from '@/lib/api-request';

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
