import { ALL_NAVIGATION, CLIENT_NAVIGATION, DEVELOPER_NAVIGATION } from '../data/navigation';
import { SettingsModule } from '../types/settings.types';

export interface IntegrityReport {
  isConsistent: boolean;
  issues: string[];
}

export const checkSettingsIntegrity = (): IntegrityReport => {
  const issues: string[] = [];

  if (CLIENT_NAVIGATION.length + DEVELOPER_NAVIGATION.length !== ALL_NAVIGATION.length) {
    issues.push('Navigation arrays length mismatch.');
  }

  const ids = new Set<string>();
  ALL_NAVIGATION.forEach(item => {
    if (ids.has(item.id)) {
      issues.push(`Duplicate navigation ID: ${item.id}`);
    }
    ids.add(item.id);

    if (!Object.values(SettingsModule).includes(item.id)) {
      issues.push(`Navigation item ${item.id} not found in SettingsModule enum.`);
    }
  });

  return {
    isConsistent: issues.length === 0,
    issues,
  };
};