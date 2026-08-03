import { UsageMetric } from '../../pages/BillingPage';
import { cn } from '../../utils/settings.helpers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  metrics: UsageMetric[];
}

export const UsageCard = ({ metrics }: Props) => {
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Usage This Cycle</h3>
      <div className="space-y-4">
        {metrics.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{item.label}</span>
                {getTrendIcon(item.trend)}
              </div>
              <span className="text-muted-foreground">
                {item.used.toLocaleString()} / {item.total.toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  (item.used / item.total) > 0.9 ? 'bg-red-500' :
                  (item.used / item.total) > 0.7 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${Math.min((item.used / item.total) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};