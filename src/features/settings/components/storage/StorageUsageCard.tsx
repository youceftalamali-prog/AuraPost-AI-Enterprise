import { UsageCategory } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  usage: UsageCategory[];
}

export const StorageUsageCard = ({ usage }: Props) => {
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Storage Usage</h3>
      <div className="space-y-4">
        {usage.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{item.label}</span>
                {getTrendIcon(item.trend)}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{item.percentage}%</span>
                <span className="font-mono text-xs">{item.size}</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  item.percentage > 80 ? 'bg-red-500' : item.percentage > 60 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};