import { History, CheckCircle2, XCircle, Info } from 'lucide-react';
import { DeveloperActivity } from '../../types/developer.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  activity: DeveloperActivity[];
}

export const DeveloperActivityCard = ({ activity }: Props) => {
  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
          <p className="text-xs text-muted-foreground">Latest system events and deployments.</p>
        </div>
      </div>
      <div className="space-y-4">
        {activity.map((item) => (
          <div key={item.id} className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
            <div className="mt-0.5">{getStatusIcon(item.status)}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{item.action}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};