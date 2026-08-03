import { useState } from 'react';
import { QueueJob, JobStatus } from './queue.types';
import { cn } from '../../../utils/settings.helpers';
import { RefreshCw, XCircle, Search } from 'lucide-react';

interface Props {
  jobs: QueueJob[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export const QueueJobsTable = ({ jobs, onRetry, onCancel }: Props) => {
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = jobs.filter(j => {
    const matchStatus = filter === 'all' || j.status === filter;
    const matchSearch = !search || j.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusColors = {
    running: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dead_letter: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="completed">Completed</option>
          <option value="dead_letter">Dead Letter</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Job Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Attempts</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((job) => (
              <tr key={job.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{job.name}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusColors[job.status])}>
                    {job.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{job.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{job.attempts}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(job.status === 'failed' || job.status === 'dead_letter') && (
                      <button onClick={() => onRetry(job.id)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    )}
                    {(job.status === 'running' || job.status === 'pending') && (
                      <button onClick={() => onCancel(job.id)} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};