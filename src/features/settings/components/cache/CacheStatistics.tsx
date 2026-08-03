import { Database, Box, Target, XCircle, Trash2, Clock } from 'lucide-react';

interface Props {
  stats: {
    totalSize: string;
    cachedObjects: number;
    hitRate: number;
    missRate: number;
    evictions: number;
    expiredKeys: number;
  };
}

export const CacheStatistics = ({ stats }: Props) => {
  const cards = [
    { label: 'Total Cache Size', value: stats.totalSize, icon: Database, color: 'text-blue-500' },
    { label: 'Cached Objects', value: stats.cachedObjects.toLocaleString(), icon: Box, color: 'text-purple-500' },
    { label: 'Hit Rate', value: `${stats.hitRate}%`, icon: Target, color: 'text-emerald-500' },
    { label: 'Miss Rate', value: `${stats.missRate}%`, icon: XCircle, color: 'text-red-500' },
    { label: 'Evictions', value: stats.evictions.toLocaleString(), icon: Trash2, color: 'text-amber-500' },
    { label: 'Expired Keys', value: stats.expiredKeys.toLocaleString(), icon: Clock, color: 'text-gray-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
};