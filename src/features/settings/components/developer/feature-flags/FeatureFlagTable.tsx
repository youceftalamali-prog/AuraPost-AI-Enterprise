import { useState } from 'react';
import { FeatureFlag } from '../../../types/featureFlags.types';
import { cn } from '../../../utils/settings.helpers';
import { Edit2, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  flags: FeatureFlag[];
  onToggle: (id: string) => void;
  onEdit: (flag: FeatureFlag) => void;
  onDelete: (id: string) => void;
  onClone: (flag: FeatureFlag) => void;
}

export const FeatureFlagTable = ({ flags, onToggle, onEdit, onDelete, onClone }: Props) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const paginated = flags.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(flags.length / pageSize) || 1;

  const envColors = {
    production: 'bg-red-500/10 text-red-600 dark:text-red-400',
    staging: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    development: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    testing: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Name / Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Environment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Rollout</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Updated</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((flag) => (
              <tr key={flag.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{flag.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{flag.key}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', envColors[flag.environment])}>
                    {flag.environment}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggle(flag.id)}
                    className={cn(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      flag.status === 'enabled' ? 'bg-emerald-500' : 'bg-muted'
                    )}
                  >
                    <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', flag.status === 'enabled' ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{flag.rolloutPercentage}%</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(flag.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onClone(flag)} className="text-muted-foreground hover:text-foreground" title="Clone"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => onEdit(flag)} className="text-muted-foreground hover:text-foreground" title="Edit"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(flag.id)} className="text-muted-foreground hover:text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
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