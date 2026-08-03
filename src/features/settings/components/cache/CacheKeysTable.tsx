import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface CacheKey {
  id: string;
  key: string;
  namespace: string;
  size: string;
  ttl: string;
  lastAccess: string;
  status: 'active' | 'expired' | 'evicted';
}

interface Props {
  keys: CacheKey[];
}

export const CacheKeysTable = ({ keys }: Props) => {
  const [search, setSearch] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const namespaces = Array.from(new Set(keys.map(k => k.namespace)));

  const filtered = keys.filter(k => {
    const matchSearch = !search || k.key.toLowerCase().includes(search.toLowerCase());
    const matchNamespace = namespaceFilter === 'all' || k.namespace === namespaceFilter;
    const matchStatus = statusFilter === 'all' || k.status === statusFilter;
    return matchSearch && matchNamespace && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    expired: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    evicted: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search keys..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm" />
        </div>
        <select value={namespaceFilter} onChange={(e) => { setNamespaceFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
          <option value="all">All Namespaces</option>
          {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="evicted">Evicted</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Namespace</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Size</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">TTL</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Last Access</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((k) => (
              <tr key={k.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-mono text-foreground truncate max-w-[200px]">{k.key}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{k.namespace}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{k.size}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{k.ttl}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(k.lastAccess).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusColors[k.status])}>
                    {k.status}
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