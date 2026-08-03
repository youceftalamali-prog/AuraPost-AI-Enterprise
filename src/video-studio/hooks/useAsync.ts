import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncResult<T> extends AsyncState<T> {
  reload: () => void;
}

/**
 * Runs an async function on mount (and when deps change), tracking
 * loading/error/data state. Exposes `reload` to re-run manually.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { ...state, reload: execute };
}