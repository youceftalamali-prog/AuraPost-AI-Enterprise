export class TimeoutError extends Error {
  readonly ms: number;

  constructor(ms: number, label = 'operation') {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
    this.ms = ms;
  }
}

/**
 * Bounds a promise with a deadline. Prevents hung provider calls from
 * blocking workers indefinitely.
 */
export function withTimeout<T>(fn: () => Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new TimeoutError(ms, label));
      }
    }, ms);

    fn()
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      });
  });
}