import { Activity, Globe, Clock, Users, FolderKanban, Code, Calendar } from 'lucide-react';
import { SystemOverview } from '../../types/system.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  overview: SystemOverview;
}

export const SystemOverviewCard = ({ overview }: Props) => {
  const statusColor = overview.status === 'operational' ? 'text-emerald-500' : overview.status === 'degraded' ? 'text-amber-500' : 'text-red-500';
  
  const cards = [
    { label: 'Status', value: overview.status, icon: Activity, color: statusColor },
    { label: 'Active Users', value: overview.activeUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Active Projects', value: overview.activeProjects, icon: FolderKanban, color: 'text-purple-500' },
    { label: 'Version', value: overview.version, icon: Code, color: 'text-muted-foreground' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">System Overview</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{card.label}</span>
            </div>
            <span className={cn("text-sm font-semibold capitalize", card.color)}>{card.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Region: <span className="font-medium text-foreground">{overview.region}</span></div>
        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Timezone: <span className="font-medium text-foreground">{overview.timezone}</span></div>
        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Last Update: <span className="font-medium text-foreground">{new Date(overview.lastUpdate).toLocaleDateString()}</span></div>
      </div>
    </div>
  );
};