import { useState } from 'react';
import { LogEntry, LogLevel } from './logs.types';
import { LogEntryRow } from './LogEntryRow';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  logs: LogEntry[];
  search: string;
  setSearch: (v: string) => void;
  levelFilter: LogLevel | 'all';
  setLevelFilter: (v: LogLevel | 'all') => void;
}

export const LogsStream = ({ logs, search, setSearch, levelFilter, setLevelFilter }: Props) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.service.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || l.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search logs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm" />
        </div>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value as any); setPage(1); }} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
          <option value="success">Success</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Message</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No logs found.</td></tr>
            ) : (
              paginated.map(log => <LogEntryRow key={log.id} log={log} />)
            )}
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