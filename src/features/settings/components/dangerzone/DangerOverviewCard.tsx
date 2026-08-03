import { Shield, AlertTriangle, Calendar, User, Lock } from 'lucide-react';
import { DangerOverview } from '../../types/dangerzone.types';
import { getRiskLevelColor, getWorkspaceStatusColor } from '../../utils/dangerzone.helpers';

interface Props {
  overview: DangerOverview;
}

export const DangerOverviewCard = ({ overview }: Props) => {
  return (
    <div className="rounded-lg border-2 border-red-500/20 bg-red-500/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">Danger Zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Irreversible and destructive actions. Proceed with extreme caution.
          </p>
          
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Risk Level</span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRiskLevelColor(overview.riskLevel)}`}>
                {overview.riskLevel}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Status</span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getWorkspaceStatusColor(overview.workspaceStatus)}`}>
                {overview.workspaceStatus}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Owner</span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{overview.owner}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(overview.creationDate).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>Protected Actions</span>
              </div>
              <p className="text-sm font-medium text-foreground">{overview.protectedActionsCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};