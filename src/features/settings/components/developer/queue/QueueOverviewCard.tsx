import { PlayCircle, Clock, XCircle, AlertOctagon } from 'lucide-react';
import { QueueStats } from './queue.types';

interface Props { stats: QueueStats; }

export const QueueOverviewCard = ({ stats }: Props) => {
  const cards = [
    { label: 'Running', value: stats.running, icon: PlayCircle, color: 'text-blue-500' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
    { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-500' },
    { label: 'Dead Letter', value: stats.deadLetter, icon: AlertOctagon, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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