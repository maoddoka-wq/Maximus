import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { useLocation, useSearch } from 'wouter';

type QueryTabOptions<T extends string> = {
  tabs: readonly T[];
  defaultTab: T;
  aliases?: Record<string, T>;
  isAllowed?: (tab: T) => boolean;
};

export function parseQueryTab<T extends string>(search: string, aliases: Record<string, T> = {}) {
  const params = new URLSearchParams(search);
  return (params.get('tab') ?? aliases[params.get('feature') ?? '']) as T | undefined;
}

/**
 * Keeps a module tab synchronized with Wouter's internal history without
 * forcing a document reload when only the query string changes.
 */
export function useQueryTab<T extends string>({ tabs, defaultTab, aliases, isAllowed }: QueryTabOptions<T>) {
  const search = useSearch();
  const [, navigate] = useLocation();
  const readRequestedTab = (value: string) => {
    const requested = parseQueryTab(value, aliases);
    return requested && tabs.includes(requested) && (!isAllowed || isAllowed(requested)) ? requested : undefined;
  };
  const [requestedTab, setRequestedTab] = useState<T | undefined>(() => readRequestedTab(search));
  const [tab, setTabState] = useState<T>(() => readRequestedTab(search) ?? defaultTab);

  useEffect(() => {
    setRequestedTab(readRequestedTab(search));
  }, [search]);

  useEffect(() => {
    const syncRequestedTab = () => setRequestedTab(readRequestedTab(window.location.search));
    window.addEventListener('pushState', syncRequestedTab);
    window.addEventListener('replaceState', syncRequestedTab);
    window.addEventListener('popstate', syncRequestedTab);
    return () => {
      window.removeEventListener('pushState', syncRequestedTab);
      window.removeEventListener('replaceState', syncRequestedTab);
      window.removeEventListener('popstate', syncRequestedTab);
    };
  }, []);

  useEffect(() => {
    if (requestedTab) setTabState(requestedTab);
  }, [requestedTab]);

  const setTab = useCallback(
    (next: SetStateAction<T>) => {
      const resolved = typeof next === 'function' ? next(tab) : next;
      if (resolved === tab || !tabs.includes(resolved) || (isAllowed && !isAllowed(resolved))) return;
      const url = new URL(window.location.href);
      url.searchParams.set('tab', resolved);
      navigate(`${url.pathname}${url.search}${url.hash}`);
      setTabState(resolved);
    },
    [isAllowed, navigate, tab, tabs],
  );

  return [tab, setTab] as const;
}