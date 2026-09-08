type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredInstallPrompt: InstallPromptEvent | null = null;
let initialized = false;
const subscribers = new Set<() => void>();

const notify = () => subscribers.forEach((listener) => listener());

export const isStandalonePwa = () =>
  window.matchMedia('(display-mode: standalone)').matches
  || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

export const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export const canInstallPwa = () => Boolean(deferredInstallPrompt) && !isStandalonePwa();

export function mountClientManifest(manifestUrl: string, storeName: string, storeLogoUrl?: string) {
  const version = encodeURIComponent(`${storeName}|${storeLogoUrl ?? ''}`);
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = `${manifestUrl}${manifestUrl.includes('?') ? '&' : '?'}v=${version}`;
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
      .then(() => navigator.serviceWorker.register(clientServiceWorker, { scope: clientScope }))
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