import { Briefcase, Layers, Database, Zap, Users, AlertTriangle, AlertCircle, Rocket } from 'lucide-react';
import { DeveloperStats } from '../../types/developer.types';

interface Props {
  stats: DeveloperStats;
}

export const DeveloperStatsCard = ({ stats }: Props) => {
  const cards = [
    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-blue-500' },
    { label: 'Queue Size', value: stats.queueSize, icon: Layers, color: 'text-purple-500' },
    { label: 'Cache Entries', value: stats.cacheEntries.toLocaleString(), icon: Database, color: 'text-emerald-500' },
    { label: 'API Requests (24h)', value: stats.apiRequests.toLocaleString(), icon: Zap, color: 'text-amber-500' },
    { label: 'Workers', value: stats.workerCount, icon: Users, color: 'text-indigo-500' },
    { label: 'Errors', value: stats.errorCount, icon: AlertCircle, color: 'text-red-500' },
    { label: 'Warnings', value: stats.warningCount, icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Last Deploy', value: new Date(stats.lastDeployment).toLocaleDateString(), icon: Rocket, color: 'text-teal-500' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">System Statistics</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium uppercase">{card.label}</span>
            </div>
            <span className="text-lg font-bold text-foreground">{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};