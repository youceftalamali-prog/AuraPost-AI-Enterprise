import { useSettingsStore } from '../store/useSettingsStore';
import { settingsApi } from '../api/settings.api';
import { ALL_NAVIGATION } from '../data/navigation';
import { settingsHealthMonitor } from '../monitoring/settingsHealthMonitor';
import { settingsProfiler } from '../monitoring/settingsProfiler';
import { settingsMetrics } from '../monitoring/settingsMetrics';

export interface SmokeTestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export const runSettingsSmokeTest = async (): Promise<SmokeTestResult[]> => {
  const results: SmokeTestResult[] = [];

  try {
    const state = useSettingsStore.getState();
    results.push({ name: 'Store', passed: typeof state.setDirty === 'function' });
  } catch (e: any) {
    results.push({ name: 'Store', passed: false, message: e.message });
  }

  try {
    results.push({ name: 'API', passed: typeof settingsApi.get === 'function' && typeof settingsApi.patch === 'function' });
  } catch (e: any) {
    results.push({ name: 'API', passed: false, message: e.message });
  }

  try {
    results.push({ name: 'Navigation', passed: ALL_NAVIGATION.length > 0 });
  } catch (e: any) {
    results.push({ name: 'Navigation', passed: false, message: e.message });
  }

  try {
    const health = settingsHealthMonitor.checkHealth();
    results.push({ name: 'Monitoring', passed: health.isHealthy !== undefined });
  } catch (e: any) {
    results.push({ name: 'Monitoring', passed: false, message: e.message });
  }

  try {
    settingsProfiler.start('smoke_test');
    const duration = settingsProfiler.end('smoke_test');
    results.push({ name: 'Profiler', passed: duration >= 0 });
  } catch (e: any) {
    results.push({ name: 'Profiler', passed: false, message: e.message });
  }

  try {
    settingsMetrics.incrementSuccess();
    results.push({ name: 'Metrics', passed: settingsMetrics.getMetrics().successCount > 0 });
  } catch (e: any) {
    results.push({ name: 'Metrics', passed: false, message: e.message });
  }

  return results;
};