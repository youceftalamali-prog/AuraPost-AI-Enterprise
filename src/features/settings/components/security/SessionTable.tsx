import { Session } from '../../types/security.types';
import { ActiveSessionRow } from './ActiveSessionRow';
import { RefreshCw, LogOut } from 'lucide-react';

interface Props {
  sessions: Session[];
  onTerminate: (id: string) => void;
  onTerminateAll: () => void;
  onRefresh: () => void;
}

export const SessionTable = ({ sessions, onTerminate, onTerminateAll, onRefresh }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-base font-semibold text-foreground">Active Sessions</h3>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={onTerminateAll} className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
            <LogOut className="h-3.5 w-3.5" /> Terminate All
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Device</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">IP Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Country</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Last Activity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => (
              <ActiveSessionRow key={s.id} session={s} onTerminate={() => onTerminate(s.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};