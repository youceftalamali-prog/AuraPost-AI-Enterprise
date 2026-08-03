import { usePermissions } from './usePermissions';
import { SettingsArea } from '../types/settings.types';

export const usePermissionGuard = () => {
  const { role } = usePermissions();

  const hasAccess = (area: SettingsArea) => {
    if (area === SettingsArea.DEVELOPER) {
      return role === 'owner' || role === 'admin' || role === 'developer';
    }
    return true;
  };

  return { hasAccess, role };
};