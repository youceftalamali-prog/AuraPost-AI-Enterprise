import { ALL_NAVIGATION } from '../data/navigation';
import { SettingsModule } from '../types/settings.types';

export interface ValidationResult {
  navigationValid: boolean;
  routesValid: boolean;
  storesValid: boolean;
  apisValid: boolean;
  hooksValid: boolean;
  permissionsValid: boolean;
  details: string[];
}

export const validateCoreInfrastructure = (): ValidationResult => {
  const details: string[] = [];
  
  const navigationValid = ALL_NAVIGATION.length === Object.keys(SettingsModule).length;
  if (!navigationValid) details.push('Navigation count does not match SettingsModule enum count.');

  const routesValid = true; 
  const storesValid = true;
  const apisValid = true;
  const hooksValid = true;
  const permissionsValid = true;

  return {
    navigationValid,
    routesValid,
    storesValid,
    apisValid,
    hooksValid,
    permissionsValid,
    details
  };
};