import { Bell, Mail, Smartphone, MessageSquare, Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { NotificationOverviewStats } from '../../types/notifications.types';

interface Props {
  stats: NotificationOverviewStats;
}

export const NotificationsOverviewCard = ({ stats }: Props) => {
  const cards = [
    { label: 'Total Sent', value: stats.total.toLocaleString(), icon: Bell, color: 'text-blue-500' },
    { label: 'Success Rate', value: `${stats.successRate}%`, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Failed', value: stats.failedCount, icon: XCircle, color: 'text-red-500' },
    { label: 'Last Sent', value: new Date(stats.lastNotification).toLocaleDateString(), icon: Clock, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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