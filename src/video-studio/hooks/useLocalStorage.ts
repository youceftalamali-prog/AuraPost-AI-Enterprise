import { useCallback, useState } from 'react';
import { safeJsonParse } from '../lib/utils';

/**
 * useState persisted to localStorage. Reads lazily on first render and
 * writes on every update. Falls back to the initial value on any error.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? safeJsonParse<T>(item, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Ignore write errors (quota / private mode)
        }
        return next;
      });
    },
    [key]
  );

  return [stored, setValue];
}