import { checkSettingsIntegrity, IntegrityReport } from './settingsIntegrity';
import { checkSettingsCoverage, CoverageReport } from './settingsCoverage';
import { runSettingsSmokeTest, SmokeTestResult } from './settingsSmokeTest';
import { settingsHealthMonitor, HealthStatus } from '../monitoring/settingsHealthMonitor';
import { settingsMetrics, SettingsMetricsData } from '../monitoring/settingsMetrics';

export interface DiagnosticsReport {
  timestamp: string;
  health: HealthStatus;
  integrity: IntegrityReport;
  coverage: CoverageReport;
  metrics: SettingsMetricsData;
  smokeTests: SmokeTestResult[];
  isProductionReady: boolean;
}

export const runFullSettingsDiagnostics = async (): Promise<DiagnosticsReport> => {
  const health = settingsHealthMonitor.checkHealth();
  const integrity = checkSettingsIntegrity();
  const coverage = checkSettingsCoverage();
  const metrics = settingsMetrics.getMetrics();
  const smokeTests = await runSettingsSmokeTest();

  const isProductionReady = 
    health.isHealthy && 
    integrity.isConsistent && 
    coverage.coveragePercentage === 100 &&
    smokeTests.every(t => t.passed);

  return {
    timestamp: new Date().toISOString(),
    health,
    integrity,
    coverage,
    metrics,
    smokeTests,
    isProductionReady,
  };
};