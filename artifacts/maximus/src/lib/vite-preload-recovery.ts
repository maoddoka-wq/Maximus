const recoveryKey = 'maximus-vite-preload-recovery';
const retryWindowMs = 60_000;
const successfulLoadGraceMs = 15_000;

export function canRetryVitePreload(
  lastAttempt: string | null,
  now: number,
): boolean {
  const previousAttempt = lastAttempt === null ? Number.NaN : Number(lastAttempt);
  return !Number.isFinite(previousAttempt) || now - previousAttempt >= retryWindowMs;
}

export function installVitePreloadRecovery(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', event => {
    const now = Date.now();

    try {
      const lastAttempt = window.sessionStorage.getItem(recoveryKey);
      if (!canRetryVitePreload(lastAttempt, now)) return;
      window.sessionStorage.setItem(recoveryKey, String(now));
    } catch {
      return;
    }

    event.preventDefault();
    window.location.reload();
  });

  window.addEventListener(
    'load',
    () => {
      let recordedAttempt: string | null;
      try {
        recordedAttempt = window.sessionStorage.getItem(recoveryKey);
      } catch {
        return;
      }
      if (recordedAttempt === null) return;

      window.setTimeout(() => {
        try {
          if (window.sessionStorage.getItem(recoveryKey) === recordedAttempt) {
            window.sessionStorage.removeItem(recoveryKey);
          }
        } catch {
          // Storage can be disabled by browser privacy settings.
        }
      }, successfulLoadGraceMs);
    },
    { once: true },
  );
}