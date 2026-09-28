type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredInstallPrompt: InstallPromptEvent | null = null;
let initialized = false;
const subscribers = new Set<() => void>();

const notify = () => subscribers.forEach((listener) => listener());

export type ClientPwaEntry = { slug?: string; domain?: boolean };
export type DriverPwaEntry = { slug: string };

export const clientPwaStorageKey = (slug?: string, domain = false) =>
  domain ? 'domain' : encodeURIComponent(slug ?? '');

const clientPwaInstalledStorageKey = (slug?: string, domain = false) =>
  `maximus:client-pwa-installed:${clientPwaStorageKey(slug, domain)}`;

export const hasInstalledClientPwa = (slug?: string, domain = false) => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(clientPwaInstalledStorageKey(slug, domain)) === 'true';
  } catch {
    return false;
  }
};

export const markClientPwaInstalled = (slug?: string, domain = false) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(clientPwaInstalledStorageKey(slug, domain), 'true');
  } catch {
    // The current page still hides the prompt in memory if persistent storage is unavailable.
  }
};

export const clearClientPwaInstalled = (slug?: string, domain = false) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(clientPwaInstalledStorageKey(slug, domain));
  } catch {
    // A fresh install prompt remains usable even when persistent storage is unavailable.
  }
};

export const clientPwaStartPath = (slug: string) =>
  `/client-app/shop/${encodeURIComponent(slug)}/accueil`;

export const clientPwaPath = (slug?: string, suffix = '', domain = false) => {
  const normalizedSuffix = suffix === ''
    ? ''
    : suffix.startsWith('/') ? suffix : `/${suffix}`;

  if (domain || !slug) {
    return `/client-app${normalizedSuffix || '/'}`;
  }

  return `/client-app/shop/${encodeURIComponent(slug)}${normalizedSuffix || '/'}`;
};

export const driverPwaPath = (slug: string, suffix = '') => {
  const normalizedSuffix = suffix === ''
    ? ''
    : suffix.startsWith('/') ? suffix : `/${suffix}`;

  return `/driver-app/shop/${encodeURIComponent(slug)}${normalizedSuffix || '/'}`;
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

export function parseDriverPwaPath(pathname: string): DriverPwaEntry | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const prefix = '/driver-app/shop/';
  if (!normalized.startsWith(prefix)) return null;

  const encodedSlug = normalized.slice(prefix.length).split('/')[0];
  if (!encodedSlug) return null;
  try {
    const slug = decodeURIComponent(encodedSlug);
    return slug && !slug.includes('/') ? { slug } : null;
  } catch {
    return null;
  }
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

export async function mountDriverManifest(manifestUrl: string, slug: string): Promise<() => void> {
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Le manifest PWA chauffeur est indisponible (${response.status}).`);
  }

  const manifest = await response.json() as { id?: unknown; start_url?: unknown; scope?: unknown };
  const expectedScope = driverPwaPath(slug).replace(/\/+$/, '') + '/';
  if (
    typeof manifest.id !== 'string'
    || typeof manifest.start_url !== 'string'
    || manifest.scope !== expectedScope
  ) {
    throw new Error('Le manifest PWA chauffeur ne correspond pas à cette boutique.');
  }

  document.querySelectorAll('link[data-maximus-driver-manifest="true"]').forEach((link) => link.remove());
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestUrl;
  link.dataset.maximusDriverManifest = 'true';
  document.head.appendChild(link);

  if ('serviceWorker' in navigator) {
    const driverScope = `${import.meta.env.BASE_URL}driver-app/`;
    const driverServiceWorker = `${driverScope}sw.js`;
    await navigator.serviceWorker.register(driverServiceWorker, {
      scope: driverScope,
      updateViaCache: 'none',
    });
  }

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