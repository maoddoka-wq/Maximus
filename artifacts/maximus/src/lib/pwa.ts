type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredInstallPrompt: InstallPromptEvent | null = null;
let initialized = false;
const subscribers = new Set<() => void>();

const notify = () => subscribers.forEach((listener) => listener());

export type ClientPwaEntry = { slug?: string; domain?: boolean; site?: boolean };

export const clientPwaStorageKey = (slug?: string, domain = false) =>
  domain ? 'domain' : encodeURIComponent(slug ?? '');

export const clientPwaStartPath = (slug: string) =>
  `/client-app/shop/${encodeURIComponent(slug)}/accueil`;

export const clientSitePwaBasePath = (slug?: string, domain = false) =>
  domain || !slug
    ? '/client-app/site'
    : `/client-app/site/${encodeURIComponent(slug)}`;

export const clientSitePwaPath = (slug?: string, suffix = '', domain = false) => {
  const normalizedSuffix = suffix === ''
    ? ''
    : suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${clientSitePwaBasePath(slug, domain)}${normalizedSuffix || '/'}`;
};

function decodePublicSlug(encodedSlug: string) {
  try {
    const slug = decodeURIComponent(encodedSlug);
    return slug && !slug.includes('/') ? slug : null;
  } catch {
    return null;
  }
}

export function publicManifestUrlForPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const clientSitePath = normalized.match(/^\/client-app\/site\/([^/]+)/);
  if (normalized === '/client-app/site') return '/api/public-site/manifest.webmanifest';
  if (clientSitePath) {
    const slug = decodePublicSlug(clientSitePath[1]);
    return slug ? `/api/public-site/manifest.webmanifest/${encodeURIComponent(slug)}` : null;
  }

  const clientShopPath = normalized.match(/^\/client-app\/shop\/([^/]+)/);
  if (clientShopPath) {
    const slug = decodePublicSlug(clientShopPath[1]);
    return slug ? `/api/shop/${encodeURIComponent(slug)}/manifest.webmanifest` : null;
  }
  if (normalized === '/client-app') return '/api/shop-domain/manifest.webmanifest';

  const publicSitePath = normalized.match(/^\/(?:site|shop)\/([^/]+)/);
  if (!publicSitePath) return null;
  const slug = decodePublicSlug(publicSitePath[1]);
  return slug ? `/api/public-site/manifest.webmanifest/${encodeURIComponent(slug)}` : null;
}

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
  const sitePrefix = '/client-app/site/';
  if (normalized === '/client-app/site') return { site: true, domain: true };
  if (normalized.startsWith(sitePrefix)) {
    const encodedSlug = normalized.slice(sitePrefix.length).split('/')[0];
    if (!encodedSlug) return null;
    try {
      const slug = decodeURIComponent(encodedSlug);
      return slug && !slug.includes('/') ? { site: true, slug } : null;
    } catch {
      return null;
    }
  }

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

export const isIosDevice = () => {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return /iphone|ipad|ipod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
};

export const canInstallPwa = () => Boolean(deferredInstallPrompt) && !isStandalonePwa();

function setClientManifestLink(manifestUrl: string) {
  let link = document.querySelector<HTMLLinkElement>('link[data-maximus-client-manifest="true"]');
  if (!link) {
    link = document.querySelector<HTMLLinkElement>('link[rel~="manifest"]');
    if (link) {
      link.dataset.maximusOriginalManifestHref = link.href;
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.dataset.maximusClientManifest = 'true';
  }

  const nextHref = new URL(manifestUrl, window.location.href).href;
  if (!link.href || link.href !== nextHref) clearDeferredInstallPrompt();
  document.querySelectorAll<HTMLLinkElement>('link[rel~="manifest"]').forEach((candidate) => {
    if (candidate !== link) candidate.remove();
  });
  link.rel = 'manifest';
  link.href = manifestUrl;
  link.dataset.manifestUrl = manifestUrl;
  return link;
}

function clearDeferredInstallPrompt() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt = null;
  notify();
}

function restoreClientManifestLink(link: HTMLLinkElement, manifestUrl: string) {
  if (link.dataset.manifestUrl !== manifestUrl) return;
  clearDeferredInstallPrompt();

  const originalHref = link.dataset.maximusOriginalManifestHref;
  if (originalHref) {
    link.href = originalHref;
    delete link.dataset.maximusOriginalManifestHref;
    delete link.dataset.maximusClientManifest;
    delete link.dataset.manifestUrl;
    return;
  }
  link.remove();
}

export function primeClientManifestFromPath(pathname = window.location.pathname) {
  const manifestUrl = publicManifestUrlForPath(pathname);
  if (manifestUrl) setClientManifestLink(manifestUrl);
}

export async function mountClientManifest(manifestUrl: string): Promise<() => void> {
  const link = setClientManifestLink(manifestUrl);
  try {
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Le manifest PWA est indisponible (${response.status}).`);
    }
    const manifest = await response.json() as {
      id?: unknown;
      start_url?: unknown;
      scope?: unknown;
      display?: unknown;
      icons?: unknown;
    };
    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const hasIconSource = icons.some(icon => Boolean(
      icon
      && typeof icon === 'object'
      && 'src' in icon
      && typeof icon.src === 'string'
      && icon.src.trim(),
    ));
    const hasRequiredIconSizes = ['192x192', '512x512'].every(size => icons.some(icon => Boolean(
      icon
      && typeof icon === 'object'
      && 'sizes' in icon
      && typeof icon.sizes === 'string'
      && icon.sizes.split(/\s+/).includes(size),
    )));
    const hasUnspecifiedIconSize = icons.some(icon => Boolean(
      icon
      && typeof icon === 'object'
      && 'src' in icon
      && typeof icon.src === 'string'
      && icon.src.trim()
      && !('sizes' in icon),
    ));
    if (
      typeof manifest.id !== 'string'
      || typeof manifest.start_url !== 'string'
      || typeof manifest.scope !== 'string'
      || manifest.display !== 'standalone'
      || !hasIconSource
      || (!hasRequiredIconSizes && !hasUnspecifiedIconSize)
    ) {
      throw new Error('Le manifest PWA ne contient pas une identité, une icône et des chemins de lancement valides.');
    }

    const identityUrl = new URL(manifest.id, window.location.href);
    const startUrl = new URL(manifest.start_url, window.location.href);
    const scopeUrl = new URL(manifest.scope, window.location.href);
    if (
      identityUrl.origin !== window.location.origin
      || startUrl.origin !== window.location.origin
      || scopeUrl.origin !== window.location.origin
      || !startUrl.pathname.startsWith(scopeUrl.pathname)
    ) {
      throw new Error('Le manifest PWA pointe vers une origine ou une portée de lancement incorrecte.');
    }
  } catch (error) {
    restoreClientManifestLink(link, manifestUrl);
    throw error;
  }

  return () => {
    restoreClientManifestLink(link, manifestUrl);
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