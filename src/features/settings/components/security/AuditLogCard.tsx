import { useState, useMemo } from 'react';
import { AuditLog } from '../../types/security.types';
import { formatDate } from '../../utils/security.helpers';
import { cn } from '../../utils/settings.helpers';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  logs: AuditLog[];
}

export const AuditLogCard = ({ logs }: Props) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filtered = useMemo(() => {
    return logs.filter(l => 
      l.action.toLowerCase().includes(search.toLowerCase()) || 
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <h3 className="text-base font-semibold text-foreground">Audit Logs</h3>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search logs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">IP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((log) => (
              <tr key={log.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(log.timestamp)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{log.user}</td>
                <td className="px-4 py-3 text-xs font-mono text-foreground">{log.action}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.resource}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.ip}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    log.result === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  )}>
                    {log.result}
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