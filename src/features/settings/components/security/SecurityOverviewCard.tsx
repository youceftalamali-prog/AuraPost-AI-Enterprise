import { Shield, Key, Monitor, Smartphone, AlertTriangle, Activity } from 'lucide-react';
import { SecurityOverview } from '../../types/security.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  overview: SecurityOverview;
}

export const SecurityOverviewCard = ({ overview }: Props) => {
  const riskColor = overview.workspaceRisk === 'low' ? 'text-emerald-500' : overview.workspaceRisk === 'medium' ? 'text-amber-500' : 'text-red-500';
  
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Security Overview</h3>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold", riskColor)}>{overview.score}</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Key className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">MFA Status</span>
          </div>
          <span className="text-sm font-semibold text-foreground capitalize">{overview.mfaStatus}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Monitor className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Active Sessions</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{overview.activeSessions}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Trusted Devices</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{overview.trustedDevices}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Login Alerts</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{overview.loginAlerts}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
        <div>Last Password Change: <span className="text-foreground font-medium">{new Date(overview.lastPasswordChange).toLocaleDateString()}</span></div>
        <div>Last Security Audit: <span className="text-foreground font-medium">{new Date(overview.lastSecurityAudit).toLocaleDateString()}</span></div>
      </div>
    </div>
  );
};