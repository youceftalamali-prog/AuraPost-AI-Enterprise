import { LucideIcon } from 'lucide-react';

export type ServiceHealth = 'healthy' | 'warning' | 'critical';

export interface DeveloperEnvironment {
  environment: string;
  workspaceId: string;
  version: string;
  buildNumber: string;
  apiVersion: string;
  nodeVersion: string;
  dbEngine: string;
  cacheEngine: string;
}

export interface DeveloperStats {
  running: number;
  pending: number;
  failed: number;
  deadLetter: number;
  workers: number;
  throughput: number;
  activeJobs: number;
  queueSize: number;
  cacheEntries: number;
  apiRequests: number;
  workerCount: number;
  errorCount: number;
  warningCount: number;
  lastDeployment: string;
}

export interface DeveloperHealth {
  database: ServiceHealth;
  api: ServiceHealth;
  cache: ServiceHealth;
  queue: ServiceHealth;
  storage: ServiceHealth;
  aiProviders: ServiceHealth;
  workers: ServiceHealth;
}

export interface DeveloperActivity {
  id: string;
  action: string;
  timestamp: string;
  status: 'success' | 'failed' | 'info';
  details: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}