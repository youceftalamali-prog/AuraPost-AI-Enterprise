import { useState, useMemo } from 'react';
import { SyncHistoryEntry, Integration, IntegrationId } from '../../pages/IntegrationsSettings';
import { cn } from '../../utils/settings.helpers';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  history: SyncHistoryEntry[];
  integrations: Integration[];
}

export const SyncHistoryTable = ({ history, integrations }: Props) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filtered = useMemo(() => {
    return history.filter(h =>
      h.operation.toLowerCase().includes(search.toLowerCase()) ||
      h.integration.toLowerCase().includes(search.toLowerCase())
    );
  }, [history, search]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const getIntegrationName = (id: IntegrationId) => {
    return integrations.find(i => i.id === id)?.name || id;
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <h3 className="text-base font-semibold text-foreground">Sync History</h3>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sync logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {new Date(entry.date).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{getIntegrationName(entry.integration)}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{entry.operation}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                    {entry.trigger}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{entry.duration}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    entry.status === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-red-500/10 text-red-600 dark:text-red-400'
                  )}>
                    {entry.status}
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border p-1.5 disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-border p-1.5 disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};