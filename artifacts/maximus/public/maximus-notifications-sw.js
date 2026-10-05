const notificationFallbackPath = () => new URL('maximus/notifications', self.registration.scope).href;
const clientAppPath = () => new URL('client-app/', self.registration.scope).pathname;

function safeNotificationData(value) {
  const href = typeof value?.href === 'string' ? value.href : '';
  const candidate = href.startsWith('/') && !href.startsWith('//')
    ? new URL(href, self.registration.scope)
    : new URL(notificationFallbackPath());
  const clientPath = clientAppPath();

  return {
    id: typeof value?.id === 'string' ? value.id.slice(0, 128) : '',
    title: typeof value?.title === 'string' && value.title.trim()
      ? value.title.trim().slice(0, 100)
      : 'MAXIMUS',
    body: typeof value?.body === 'string' ? value.body.slice(0, 240) : 'Vous avez une nouvelle notification.',
    href: candidate.origin === self.location.origin && !candidate.pathname.startsWith(clientPath)
      ? candidate.href
      : notificationFallbackPath(),
  };
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = {};
    }

    const notification = safeNotificationData(payload);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visibleMaximusWindows = windows.filter((client) => {
      const url = new URL(client.url);
      return url.origin === self.location.origin
        && !url.pathname.startsWith(clientAppPath())
        && client.visibilityState === 'visible';
    });

    if (visibleMaximusWindows.length > 0) {
      visibleMaximusWindows.forEach((client) => {
        client.postMessage({ type: 'MAXIMUS_PUSH_NOTIFICATION', notification });
      });
      return;
    }

    await self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: new URL('maximus-mark.svg', self.registration.scope).href,
      badge: new URL('favicon.svg', self.registration.scope).href,
      tag: notification.id ? `maximus-${notification.id}` : undefined,
      data: notification,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notification = safeNotificationData(event.notification.data);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appWindow = windows.find((client) => {
      const url = new URL(client.url);
      return url.origin === self.location.origin && !url.pathname.startsWith(clientAppPath());
    });

    if (appWindow) {
      await appWindow.navigate(notification.href);
      await appWindow.focus();
      return;
    }

    await self.clients.openWindow(notification.href);
  })());
});
