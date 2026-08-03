import { useEffect, useRef } from 'react';

/**
 * Polls a callback at a fixed interval while `enabled` is true.
 * Errors are swallowed so polling continues uninterrupted. The latest
 * callback is always used without re-triggering the interval.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number, enabled = true): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async (): Promise<void> => {
      if (!active) return;
      try {
        await savedCallback.current();
      } catch {
        // Swallow — polling must continue
      } finally {
        if (active) {
          timer = setTimeout(tick, intervalMs);
        }
      }
    };

    void tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs, enabled]);
}