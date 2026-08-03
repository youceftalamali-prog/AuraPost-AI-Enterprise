import { 
  SecurityOverview, Session, LoginEvent, TrustedDevice, 
  PasswordPolicy, WorkspaceSecurity, IpRule, AuditLog 
} from '../types/security.types';

export const MOCK_OVERVIEW: SecurityOverview = {
  score: 85,
  mfaStatus: 'enabled',
  activeSessions: 3,
  trustedDevices: 2,
  loginAlerts: 1,
  workspaceRisk: 'low',
  lastPasswordChange: '2025-12-01T10:00:00Z',
  lastSecurityAudit: '2026-01-10T14:00:00Z',
};

export const MOCK_SESSIONS: Session[] = [
  { id: '1', device: 'MacBook Pro', browser: 'Chrome', os: 'macOS 14.2', ip: '192.168.1.10', country: 'United States', lastActivity: '2026-01-26T12:05:00Z', created: '2026-01-20T09:00:00Z', isCurrent: true },
  { id: '2', device: 'iPhone 15', browser: 'Safari', os: 'iOS 17.2', ip: '10.0.0.5', country: 'United States', lastActivity: '2026-01-25T18:30:00Z', created: '2026-01-15T08:00:00Z', isCurrent: false },
  { id: '3', device: 'Windows PC', browser: 'Firefox', os: 'Windows 11', ip: '203.0.113.45', country: 'Germany', lastActivity: '2026-01-24T11:00:00Z', created: '2026-01-10T14:00:00Z', isCurrent: false },
];

export const MOCK_LOGIN_HISTORY: LoginEvent[] = [
  { id: '1', date: '2026-01-26T12:00:00Z', email: 'admin@company.com', ip: '192.168.1.10', browser: 'Chrome', device: 'MacBook Pro', country: 'US', status: 'success' },
  { id: '2', date: '2026-01-26T11:55:00Z', email: 'admin@company.com', ip: '192.168.1.10', browser: 'Chrome', device: 'MacBook Pro', country: 'US', status: 'mfa' },
  { id: '3', date: '2026-01-25T09:00:00Z', email: 'unknown@hacker.com', ip: '45.33.22.11', browser: 'Bot', device: 'Unknown', country: 'RU', status: 'failed', failureReason: 'Invalid credentials' },
  { id: '4', date: '2026-01-24T14:00:00Z', email: 'john.doe@company.com', ip: '10.0.0.5', browser: 'Safari', device: 'iPhone 15', country: 'US', status: 'success' },
];

export const MOCK_TRUSTED_DEVICES: TrustedDevice[] = [
  { id: '1', name: 'Work Laptop', browser: 'Chrome', lastSeen: '2026-01-26T12:00:00Z', added: '2025-11-01T10:00:00Z', status: 'active' },
  { id: '2', name: 'Personal Phone', browser: 'Safari', lastSeen: '2026-01-25T18:00:00Z', added: '2025-12-15T09:00:00Z', status: 'active' },
];

export const MOCK_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireNumbers: true,
  requireSymbols: true,
  requireUppercase: true,
  expirationDays: 90,
  historyCount: 5,
  failedAttemptsLimit: 5,
};

export const MOCK_WORKSPACE_SECURITY: WorkspaceSecurity = {
  forceMfa: true,
  forceEmailVerification: true,
  disablePublicInvites: false,
  sessionTimeout: 60,
  idleTimeout: 15,
  maxDevices: 5,
};

export const MOCK_IP_WHITELIST: IpRule[] = [
  { id: '1', ip: '192.168.1.0/24', description: 'Office Network', enabled: true },
  { id: '2', ip: '203.0.113.5', description: 'Backup Server', enabled: false },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: '1', timestamp: '2026-01-26T12:10:00Z', user: 'admin@company.com', action: 'UPDATE_PASSWORD_POLICY', resource: 'Security Settings', ip: '192.168.1.10', device: 'MacBook Pro', result: 'success' },
  { id: '2', timestamp: '2026-01-26T11:00:00Z', user: 'john.doe@company.com', action: 'LOGIN', resource: 'Auth', ip: '10.0.0.5', device: 'iPhone 15', result: 'success' },
  { id: '3', timestamp: '2026-01-25T16:00:00Z', user: 'unknown', action: 'FAILED_LOGIN', resource: 'Auth', ip: '45.33.22.11', device: 'Unknown', result: 'failure' },
];

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};