import { Users, Zap } from 'lucide-react';
import { QueueStats } from './queue.types';

interface Props { stats: QueueStats; }

export const QueueStatsCard = ({ stats }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Queue Health & Workers</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Workers</p>
            <p className="text-2xl font-bold text-foreground">{stats.workers}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Throughput</p>
            <p className="text-2xl font-bold text-foreground">{stats.throughput} <span className="text-sm font-normal text-muted-foreground">jobs/min</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};