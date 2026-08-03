import { Activity, Zap, Clock, AlertTriangle } from 'lucide-react';
import { ApiUsageStats } from '../../types/api.types';

interface Props {
  stats: ApiUsageStats;
}

export const ApiUsageCard = ({ stats }: Props) => {
  const cards = [
    { label: 'Requests Today', value: stats.requestsToday.toLocaleString(), icon: Activity, color: 'text-blue-500' },
    { label: 'Rate Limit', value: `${stats.remaining} / ${stats.rateLimit}`, icon: Zap, color: 'text-amber-500' },
    { label: 'Avg Latency', value: `${stats.avgLatency}ms`, icon: Clock, color: 'text-emerald-500' },
    { label: 'Error Rate', value: `${stats.errorRate}%`, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
};