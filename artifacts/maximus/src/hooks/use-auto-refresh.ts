import { useEffect, useRef } from 'react';

type RefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

/**
 * Keeps server-backed screens fresh without forcing a full-page reload.
 * Refreshes on focus/visibility changes and at a conservative interval while
 * the page is visible. The callback is kept in a ref so callers can pass a
 * render-local function without restarting the listeners on every render.
 */
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  { enabled = true, intervalMs = 30_000 }: RefreshOptions = {},
) {
  const refreshRef = useRef(refresh);
  const runningRef = useRef(false);

  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      if (document.visibilityState !== 'visible' || runningRef.current) return;
      runningRef.current = true;
      Promise.resolve(refreshRef.current()).finally(() => {
        runningRef.current = false;
      });
    };

    const onFocus = () => run();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(run, intervalMs);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [enabled, intervalMs]);
}