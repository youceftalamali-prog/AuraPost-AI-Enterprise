import { DangerOverview } from '../types/dangerzone.types';

export const MOCK_DANGER_OVERVIEW: DangerOverview = {
  riskLevel: 'medium',
  workspaceStatus: 'active',
  owner: 'admin@company.com',
  creationDate: '2024-01-15T10:00:00Z',
  protectedActionsCount: 7,
};

export const MOCK_WORKSPACE_NAME = 'Acme Corporation';

export const MOCK_USERS = [
  { id: '1', name: 'John Doe', email: 'john.doe@company.com', role: 'admin' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com', role: 'admin' },
  { id: '3', name: 'Bob Johnson', email: 'bob.johnson@company.com', role: 'member' },
];

export const getRiskLevelColor = (level: string): string => {
  switch (level) {
    case 'low': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'high': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    case 'critical': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const getWorkspaceStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'archived': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    case 'suspended': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const simulateExport = (options: any): string => {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    ...options,
  };
  return JSON.stringify(exportData, null, 2);
};