import { AlertCircle, AlertTriangle, Info, CheckCircle2, Bug } from 'lucide-react';
import { LogEntry } from './logs.types';

interface Props { logs: LogEntry[]; }

export const LogsOverviewCard = ({ logs }: Props) => {
  const counts = {
    error: logs.filter(l => l.level === 'error').length,
    warning: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    success: logs.filter(l => l.level === 'success').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  const cards = [
    { label: 'Errors', value: counts.error, icon: AlertCircle, color: 'text-red-500' },
    { label: 'Warnings', value: counts.warning, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Info', value: counts.info, icon: Info, color: 'text-blue-500' },
    { label: 'Success', value: counts.success, icon: CheckCircle2, color: 'text-emerald-500' },
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