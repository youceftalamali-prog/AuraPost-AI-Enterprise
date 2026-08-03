import { ALL_NAVIGATION } from '../data/navigation';
import { SettingsModule } from '../types/settings.types';

export interface HealthStatus {
  isHealthy: boolean;
  modulesAvailable: number;
  totalModules: number;
  routesValid: boolean;
  lastChecked: string;
}

class SettingsHealthMonitor {
  private status: HealthStatus = {
    isHealthy: true,
    modulesAvailable: 0,
    totalModules: 0,
    routesValid: true,
    lastChecked: new Date().toISOString(),
  };

  checkHealth(): HealthStatus {
    const total = Object.keys(SettingsModule).length;
    const available = ALL_NAVIGATION.length;
    
    this.status = {
      isHealthy: available === total,
      modulesAvailable: available,
      totalModules: total,
      routesValid: available === total,
      lastChecked: new Date().toISOString(),
    };
    
    return this.status;
  }

  getStatus(): HealthStatus {
    return this.status;
  }
}

export const settingsHealthMonitor = new SettingsHealthMonitor();