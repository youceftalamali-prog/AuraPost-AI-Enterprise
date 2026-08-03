import { apiClient } from '../../../core/api/client';
import { SettingsModule } from '../types/settings.types';
import { getDeduplicatedRequest, generateRequestKey } from '../utils/requestDeduplicator';
import { mapSettingsError } from '../utils/settingsErrorMapper';

const BASE_URL = '/settings';
const DEFAULT_TIMEOUT = 15000;

const createAbortableRequest = <T>(requestFn: () => Promise<T>, timeout: number = DEFAULT_TIMEOUT): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    requestFn()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
};

export const settingsApi = {
  async get<T>(module: SettingsModule, workspaceId: string = 'current'): Promise<T> {
    const url = `${BASE_URL}/${module}/${workspaceId}`;
    const key = generateRequestKey('GET', url);
    return getDeduplicatedRequest(key, async () => {
      try {
        return await createAbortableRequest(() => apiClient.get<T>(url));
      } catch (error) {
        throw new Error(mapSettingsError(error));
      }
    });
  },
  async patch<T>(module: SettingsModule, workspaceId: string = 'current', payload: unknown): Promise<T> {
    const url = `${BASE_URL}/${module}/${workspaceId}`;
    const key = generateRequestKey('PATCH', url, payload);
    return getDeduplicatedRequest(key, async () => {
      try {
        return await createAbortableRequest(() => apiClient.patch<T>(url, payload));
      } catch (error) {
        throw new Error(mapSettingsError(error));
      }
    });
  },
  async post<T>(module: SettingsModule, workspaceId: string = 'current', payload: unknown): Promise<T> {
    const url = `${BASE_URL}/${module}/${workspaceId}`;
    const key = generateRequestKey('POST', url, payload);
    return getDeduplicatedRequest(key, async () => {
      try {
        return await createAbortableRequest(() => apiClient.post<T>(url, payload));
      } catch (error) {
        throw new Error(mapSettingsError(error));
      }
    });
  },
  async delete<T>(module: SettingsModule, workspaceId: string = 'current'): Promise<T> {
    const url = `${BASE_URL}/${module}/${workspaceId}`;
    const key = generateRequestKey('DELETE', url);
    return getDeduplicatedRequest(key, async () => {
      try {
        return await createAbortableRequest(() => apiClient.delete<T>(url));
      } catch (error) {
        throw new Error(mapSettingsError(error));
      }
    });
  }
};