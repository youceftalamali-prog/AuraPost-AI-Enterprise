import { ALL_NAVIGATION } from '../data/navigation';
import { SettingsModule } from '../types/settings.types';

export interface CoverageReport {
  totalModules: number;
  registeredModules: number;
  coveragePercentage: number;
  missingModules: string[];
}

export const checkSettingsCoverage = (): CoverageReport => {
  const allModules = Object.values(SettingsModule);
  const registeredIds = new Set(ALL_NAVIGATION.map(n => n.id));

  const missing = allModules.filter(m => !registeredIds.has(m));

  return {
    totalModules: allModules.length,
    registeredModules: registeredIds.size,
    coveragePercentage: (registeredIds.size / allModules.length) * 100,
    missingModules: missing,
  };
};