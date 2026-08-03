import { useState, useMemo } from 'react';
import { StorageHistoryEntry, HistoryAction } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';
import { Search } from 'lucide-react';

interface Props {
  history: StorageHistoryEntry[];
}

export const StorageHistoryTable = ({ history }: Props) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | HistoryAction>('all');

  const filtered = useMemo(() => {
    return history.filter(h => {
      const matchSearch = h.object.toLowerCase().includes(search.toLowerCase()) || h.user.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === 'all' || h.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [history, search, actionFilter]);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <h3 className="text-base font-semibold text-foreground">Storage History</h3>
        <div className="flex flex-1 gap-2 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm" />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as any)} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option value="all">All Actions</option>
            <option value="upload">Upload</option>
            <option value="delete">Delete</option>
            <option value="backup">Backup</option>
            <option value="restore">Restore</option>
            <option value="cleanup">Cleanup</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Object</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Size</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((h) => (
              <tr key={h.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(h.time).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-foreground">{h.action}</span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{h.user}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground truncate max-w-[200px]">{h.object}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{h.size}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', h.result === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600')}>
                    {h.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};