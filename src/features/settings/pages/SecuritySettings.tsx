import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { SecurityOverview, Session, LoginEvent, TrustedDevice, PasswordPolicy, WorkspaceSecurity, IpRule, AuditLog } from '../types/security.types';
import { SecuritySkeleton } from '../components/security/SecuritySkeleton';
import { SecurityOverviewCard } from '../components/security/SecurityOverviewCard';
import { TwoFactorCard } from '../components/security/TwoFactorCard';
import { SessionTable } from '../components/security/SessionTable';
import { LoginHistoryTable } from '../components/security/LoginHistoryTable';
import { TrustedDevicesCard } from '../components/security/TrustedDevicesCard';
import { PasswordPolicyCard } from '../components/security/PasswordPolicyCard';
import { WorkspaceSecurityCard } from '../components/security/WorkspaceSecurityCard';
import { IpWhitelistCard } from '../components/security/IpWhitelistCard';
import { AuditLogCard } from '../components/security/AuditLogCard';

interface SecurityData {
  overview: SecurityOverview;
  sessions: Session[];
  history: LoginEvent[];
  trustedDevices: TrustedDevice[];
  passwordPolicy: PasswordPolicy;
  workspaceSecurity: WorkspaceSecurity;
  ipWhitelist: IpRule[];
  auditLogs: AuditLog[];
}

export const SecuritySettings = () => {
  const { data, isLoading, updateData, executeAction, refetch } = useModuleData<SecurityData>(SettingsModule.SECURITY);

  if (isLoading || !data) return <SecuritySkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace security settings, sessions, and access controls.</p>
      </div>
      <SecurityOverviewCard overview={data.overview} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <TwoFactorCard mfaStatus={data.overview.mfaStatus} onEnable={() => executeAction({ action: 'enable_mfa' })} onDisable={() => executeAction({ action: 'disable_mfa' })} onRegenerate={() => executeAction({ action: 'regen_mfa' })} onViewCodes={() => executeAction({ action: 'view_mfa_codes' })} />
        <TrustedDevicesCard devices={data.trustedDevices} onRemove={(id) => executeAction({ action: 'remove_device', id }).then(refetch)} onRename={() => {}} />
      </div>
      <SessionTable sessions={data.sessions} onTerminate={(id) => executeAction({ action: 'terminate_session', id }).then(refetch)} onTerminateAll={() => executeAction({ action: 'terminate_all_sessions' }).then(refetch)} onRefresh={refetch} />
      <LoginHistoryTable history={data.history} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <PasswordPolicyCard policy={data.passwordPolicy} onChange={async (u) => { await updateData({ passwordPolicy: { ...data.passwordPolicy, ...u } }); }} />
        <WorkspaceSecurityCard settings={data.workspaceSecurity} onChange={async (u) => { await updateData({ workspaceSecurity: { ...data.workspaceSecurity, ...u } }); }} />
      </div>
      <IpWhitelistCard rules={data.ipWhitelist} onAdd={async (ip, desc) => { await executeAction({ action: 'add_ip', ip, desc }); refetch(); }} onRemove={async (id) => { await executeAction({ action: 'remove_ip', id }); refetch(); }} onToggle={async (id) => { await executeAction({ action: 'toggle_ip', id }); refetch(); }} />
      <AuditLogCard logs={data.auditLogs} />
    </div>
  );
};