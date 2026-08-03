import { 
  DeveloperEnvironment, DeveloperStats, DeveloperHealth, 
  DeveloperActivity, NavigationItem 
} from '../types/developer.types';
import { 
  Bug, FileText, Layers, Database as DbIcon, Flag, Settings2, 
  Server, Briefcase, Users, Activity 
} from 'lucide-react';

export const MOCK_ENVIRONMENT: DeveloperEnvironment = {
  environment: 'Production',
  workspaceId: 'ws_8a7b9c0d1e2f',
  version: 'v2.4.1',
  buildNumber: '4892',
  apiVersion: 'v1',
  nodeVersion: 'v20.11.0',
  dbEngine: 'PostgreSQL 16',
  cacheEngine: 'Redis 7.2',
};

export const MOCK_STATS: DeveloperStats = {
  running: 12,
  pending: 28,
  failed: 3,
  deadLetter: 2,
  workers: 4,
  throughput: 342,
  activeJobs: 12,
  queueSize: 45,
  cacheEntries: 12450,
  apiRequests: 89432,
  workerCount: 4,
  errorCount: 3,
  warningCount: 14,
  lastDeployment: '2026-01-25T14:30:00Z',
};

export const MOCK_HEALTH: DeveloperHealth = {
  database: 'healthy',
  api: 'healthy',
  cache: 'healthy',
  queue: 'warning',
  storage: 'healthy',
  aiProviders: 'healthy',
  workers: 'healthy',
};

export const MOCK_ACTIVITY: DeveloperActivity[] = [
  { id: '1', action: 'Deployment', timestamp: '2026-01-25T14:30:00Z', status: 'success', details: 'v2.4.1 deployed to production cluster' },
  { id: '2', action: 'Backup', timestamp: '2026-01-25T02:00:00Z', status: 'success', details: 'Daily automated database backup completed' },
  { id: '3', action: 'Migration', timestamp: '2026-01-24T10:15:00Z', status: 'success', details: 'Database migration #42 applied successfully' },
  { id: '4', action: 'Queue Restart', timestamp: '2026-01-23T18:45:00Z', status: 'info', details: 'Queue workers restarted manually by admin' },
  { id: '5', action: 'Cache Clear', timestamp: '2026-01-22T09:00:00Z', status: 'success', details: 'Global application cache purged' },
];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'debug', label: 'Debug', description: 'Inspect requests and responses', icon: Bug },
  { id: 'logs', label: 'Logs', description: 'View application and system logs', icon: FileText },
  { id: 'queue', label: 'Queue', description: 'Manage background jobs and workers', icon: Layers },
  { id: 'cache', label: 'Cache', description: 'Monitor and manage cache layers', icon: DbIcon },
  { id: 'feature-flags', label: 'Feature Flags', description: 'Toggle experimental features', icon: Flag },
  { id: 'environment', label: 'Environment', description: 'Manage env variables and secrets', icon: Settings2 },
  { id: 'database', label: 'Database', description: 'Run queries and inspect schema', icon: Server },
  { id: 'jobs', label: 'Jobs', description: 'View scheduled and cron jobs', icon: Briefcase },
  { id: 'workers', label: 'Workers', description: 'Monitor worker processes', icon: Users },
  { id: 'monitoring', label: 'Monitoring', description: 'Metrics, traces, and alerts', icon: Activity },
];