import { useState } from 'react';
import { LoginEvent } from '../../types/security.types';
import { formatDate } from '../../utils/security.helpers';
import { cn } from '../../utils/settings.helpers';
import { Search } from 'lucide-react';

interface Props {
  history: LoginEvent[];
}

export const LoginHistoryTable = ({ history }: Props) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'mfa'>('all');

  const filtered = history.filter(h => filter === 'all' || h.status === filter);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-base font-semibold text-foreground">Login History</h3>
        <div className="flex gap-2">
          {(['all', 'success', 'failed', 'mfa'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">IP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Device</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((h) => (
              <tr key={h.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(h.date)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{h.email}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{h.ip}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{h.device} ({h.browser})</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    h.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 
                    h.status === 'failed' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'
                  )}>
                    {h.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{h.failureReason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};