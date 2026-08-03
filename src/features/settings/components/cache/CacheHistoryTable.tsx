import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface HistoryEntry {
  id: string;
  time: string;
  action: string;
  target: string;
  user: string;
  result: 'success' | 'failed';
}

interface Props {
  history: HistoryEntry[];
}

export const CacheHistoryTable = ({ history }: Props) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filtered = history.filter(h => 
    h.action.toLowerCase().includes(search.toLowerCase()) || 
    h.target.toLowerCase().includes(search.toLowerCase()) ||
    h.user.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <h3 className="text-base font-semibold text-foreground">Cache History</h3>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search history..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Target</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((h) => (
              <tr key={h.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(h.time).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{h.action}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{h.target}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{h.user}</td>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border p-1.5 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-border p-1.5 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};