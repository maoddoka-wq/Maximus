type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredInstallPrompt: InstallPromptEvent | null = null;
let initialized = false;
const subscribers = new Set<() => void>();

const notify = () => subscribers.forEach((listener) => listener());

export type ClientPwaEntry = { slug?: string; domain?: boolean };

export const clientPwaStorageKey = (slug?: string, domain = false) =>
  domain ? 'domain' : encodeURIComponent(slug ?? '');

export const clientPwaStartPath = (slug: string) =>
  `/client-app/shop/${encodeURIComponent(slug)}/`;

export const clientPwaPath = (slug?: string, suffix = '', domain = false) => {
  const normalizedSuffix = suffix === ''
    ? ''
    : suffix.startsWith('/') ? suffix : `/${suffix}`;

  if (domain || !slug) {
    return `/client-app${normalizedSuffix || '/'}`;
  }

  return `/client-app/shop/${encodeURIComponent(slug)}${normalizedSuffix || '/'}`;
};

export function parseClientPwaPath(pathname: string): ClientPwaEntry | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const shopPrefix = '/client-app/shop/';
  if (normalized.startsWith(shopPrefix)) {
    const encodedSlug = normalized.slice(shopPrefix.length).split('/')[0];
    if (!encodedSlug) return null;
    try {
      const slug = decodeURIComponent(encodedSlug);
      return slug && !slug.includes('/') ? { slug } : null;
    } catch {
      return null;
    }
  }
  if (normalized === '/client-app/shop') return null;
  return normalized === '/client-app' || normalized.startsWith('/client-app/')
    ? { domain: true }
    : null;
}

export const isStandalonePwa = () =>
  window.matchMedia('(display-mode: standalone)').matches
  || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

export const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export const canInstallPwa = () => Boolean(deferredInstallPrompt) && !isStandalonePwa();

export async function mountClientManifest(manifestUrl: string): Promise<() => void> {
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Le manifest PWA est indisponible (${response.status}).`);
  }
  const manifest = await response.json() as { id?: unknown; start_url?: unknown; scope?: unknown };
  if (typeof manifest.id !== 'string' || typeof manifest.start_url !== 'string' || typeof manifest.scope !== 'string') {
    throw new Error('Le manifest PWA ne contient pas d’identité de boutique.');
  }

  document.querySelectorAll('link[data-maximus-client-manifest="true"]').forEach((link) => link.remove());
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestUrl;
  link.dataset.maximusClientManifest = 'true';
  document.head.appendChild(link);

  return () => {
    link.remove();
  };
}

export function initializePwa() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notify();
  });

  if ('serviceWorker' in navigator) {
    const clientScope = `${import.meta.env.BASE_URL}client-app/`;
    const clientServiceWorker = `${clientScope}sw.js`;
    const rootScope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(
        registrations
          .filter((registration) => registration.scope === rootScope && registration.active?.scriptURL.endsWith('/sw.js'))
          .map((registration) => registration.unregister()),
      ))
      .then(() => navigator.serviceWorker.register(clientServiceWorker, { scope: clientScope, updateViaCache: 'none' }))
      .catch((error: unknown) => {
        console.warn('Le service worker client MAXIMUS n’a pas pu être enregistré.', error);
      });
  }
}

export function subscribeToPwaInstall(listener: () => void) {
  subscribers.add(listener);
  listener();
  return () => {
    subscribers.delete(listener);
  };
}

export async function promptPwaInstall() {
  if (!deferredInstallPrompt || isStandalonePwa()) return false;
  const event = deferredInstallPrompt;
  await event.prompt();
  const choice = await event.userChoice;
  deferredInstallPrompt = null;
  notify();
  return choice.outcome === 'accepted';
}