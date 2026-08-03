export const shouldRetry = (error: any, attempt: number): boolean => {
  if (attempt >= 3) return false;
  if (!error) return false;
  if (error.name === 'AbortError') return false;
  if (error.message === 'Failed to fetch' || !error.response) return true;
  if (error.response?.status >= 500) return true;
  if (error.response?.status === 429) return true;
  return false;
};

export const getRetryDelay = (attempt: number): number => {
  return Math.pow(2, attempt) * 1000;
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));