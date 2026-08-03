import { HardDrive, Database, TrendingUp, Activity } from 'lucide-react';
import { StorageOverview } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  overview: StorageOverview;
}

export const StorageOverviewCard = ({ overview }: Props) => {
  const cards = [
    { label: 'Used Storage', value: overview.used, sub: `of ${overview.limit}`, icon: HardDrive, color: 'text-blue-500' },
    { label: 'Objects Count', value: overview.objectsCount.toLocaleString(), sub: 'Total files', icon: Database, color: 'text-purple-500' },
    { label: 'Monthly Growth', value: overview.monthlyGrowth, sub: 'vs last month', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Provider Health', value: overview.providerHealth, sub: 'Primary provider', icon: Activity, color: 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground capitalize">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
};