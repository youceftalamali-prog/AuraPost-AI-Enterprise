import { useState, useEffect, useCallback, useRef } from 'react';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { shouldRetry, getRetryDelay, delay } from '../utils/settingsRetry';

export function useModuleData<T>(module: SettingsModule, workspaceId: string = 'current') {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef<T | null>(null);

  const fetchData = useCallback(async (attempt = 0) => {
    if (attempt === 0) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const result = await settingsApi.get<T>(module, workspaceId);
      setData(result);
      draftRef.current = result;
    } catch (err: any) {
      if (shouldRetry(err, attempt)) {
        await delay(getRetryDelay(attempt));
        return fetchData(attempt + 1);
      }
      setError(err.message || 'Failed to load data');
    } finally {
      if (attempt === 0) setIsLoading(false);
    }
  }, [module, workspaceId]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    const handleSave = async () => {
      if (!draftRef.current) return;
      try {
        const result = await settingsApi.patch<T>(module, workspaceId, draftRef.current);
        setData(result);
        draftRef.current = result;
        window.dispatchEvent(new CustomEvent('settings:save:response', { detail: { success: true } }));
      } catch (err: any) {
        window.dispatchEvent(new CustomEvent('settings:save:response', { detail: { success: false, error: err } }));
      }
    };

    window.addEventListener('settings:save', handleSave);
    return () => window.removeEventListener('settings:save', handleSave);
  }, [module, workspaceId]);

  const updateData = useCallback(async (payload: any) => {
    setError(null);
    try {
      const result = await settingsApi.patch<T>(module, workspaceId, payload);
      setData(result);
      draftRef.current = result;
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to save data');
      throw err;
    }
  }, [module, workspaceId]);

  const executeAction = useCallback(async (actionPayload: any) => {
    return settingsApi.patch(module, workspaceId, actionPayload);
  }, [module, workspaceId]);

  const setDraftData = useCallback((newData: T) => {
    setData(newData);
    draftRef.current = newData;
  }, []);

  return { data, isLoading, error, refetch: () => fetchData(0), updateData, executeAction, setData: setDraftData };
}