export interface SecurityOverview {
  score: number;
  mfaStatus: 'disabled' | 'enabled' | 'pending';
  activeSessions: number;
  trustedDevices: number;
  loginAlerts: number;
  workspaceRisk: 'low' | 'medium' | 'high';
  lastPasswordChange: string;
  lastSecurityAudit: string;
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  country: string;
  lastActivity: string;
  created: string;
  isCurrent: boolean;
}

export interface LoginEvent {
  id: string;
  date: string;
  email: string;
  ip: string;
  browser: string;
  device: string;
  country: string;
  status: 'success' | 'failed' | 'mfa';
  failureReason?: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  browser: string;
  lastSeen: string;
  added: string;
  status: 'active' | 'expired';
}

export interface PasswordPolicy {
  minLength: number;
  requireNumbers: boolean;
  requireSymbols: boolean;
  requireUppercase: boolean;
  expirationDays: number;
  historyCount: number;
  failedAttemptsLimit: number;
}

export interface WorkspaceSecurity {
  forceMfa: boolean;
  forceEmailVerification: boolean;
  disablePublicInvites: boolean;
  sessionTimeout: number;
  idleTimeout: number;
  maxDevices: number;
}

export interface IpRule {
  id: string;
  ip: string;
  description: string;
  enabled: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
  device: string;
  result: 'success' | 'failure';
}