export type FlagEnvironment = 'production' | 'staging' | 'development' | 'testing';
export type FlagCategory = 'experimental' | 'beta' | 'internal' | 'release' | 'security' | 'ai' | 'storage' | 'billing' | 'workspace';
export type FlagStatus = 'enabled' | 'disabled' | 'archived';

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  environment: FlagEnvironment;
  category: FlagCategory;
  status: FlagStatus;
  rolloutPercentage: number;
  targetRoles: string[];
  expirationDate: string | null;
  dependencies: string[];
  killSwitch: boolean;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlagHistoryEntry {
  id: string;
  flagId: string;
  timestamp: string;
  user: string;
  action: string;
  oldValue: string;
  newValue: string;
  reason: string;
}