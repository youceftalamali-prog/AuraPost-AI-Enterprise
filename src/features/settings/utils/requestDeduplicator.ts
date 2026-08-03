const pendingRequests = new Map<string, Promise<any>>();

export const getDeduplicatedRequest = <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

export const generateRequestKey = (method: string, url: string, payload?: any): string => {
  return `${method}:${url}:${payload ? JSON.stringify(payload) : ''}`;
};