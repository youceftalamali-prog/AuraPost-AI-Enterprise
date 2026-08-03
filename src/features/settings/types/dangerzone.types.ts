export interface DangerOverview {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  workspaceStatus: 'active' | 'archived' | 'suspended';
  owner: string;
  creationDate: string;
  protectedActionsCount: number;
}

export interface TransferOwnershipData {
  currentOwner: string;
  newOwnerEmail: string;
  newOwnerName: string;
  reason: string;
}

export interface DeleteWorkspaceData {
  workspaceName: string;
  confirmationText: string;
  reason: string;
}

export interface DeleteDataOptions {
  logs: boolean;
  analytics: boolean;
  uploads: boolean;
  cache: boolean;
}

export interface ExportOptions {
  configuration: boolean;
  assets: boolean;
  users: boolean;
  billing: boolean;
}

export interface ArchiveData {
  reason: string;
  archiveDate: string;
}

export interface ResetData {
  reason: string;
  keepData: boolean;
}