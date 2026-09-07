import { useEffect, useRef } from 'react';

/**
 * Persists the latest store value without blocking the render that triggered it.
 * The first render is intentionally not written back because it already came
 * from storage (or from the seed data).
 */
export function useDebouncedPersistence<T>(
  value: T,
  persist: (value: T) => void,
  delay = 180,
) {
  const valueRef = useRef(value);
  const hasMountedRef = useRef(false);

  valueRef.current = value;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return undefined;
    }

    const timer = window.setTimeout(() => persist(valueRef.current), delay);
    return () => window.clearTimeout(timer);
  }, [delay, persist, value]);

  useEffect(() => {
    const flush = () => persist(valueRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [persist]);
}