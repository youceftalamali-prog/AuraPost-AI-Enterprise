import { Edit2, Trash2, Key, Copy, Check } from 'lucide-react';
import { ApiKey } from '../../types/api.types';
import { cn } from '../../utils/settings.helpers';
import { formatDate } from '../../utils/api.helpers';
import { useState } from 'react';

interface Props {
  keys: ApiKey[];
  onEdit: (key: ApiKey) => void;
  onDelete: (key: ApiKey) => void;
}

export const ApiKeyTable = ({ keys, onEdit, onDelete }: Props) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyKey = (prefix: string, id: string) => {
    navigator.clipboard.writeText(prefix + '...');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Used</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {keys.map((key) => (
            <tr key={key.id} className="transition-colors hover:bg-muted/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{key.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  {key.keyPrefix}...
                  <button
                    onClick={() => copyKey(key.keyPrefix, key.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copiedId === key.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {key.permissions.slice(0, 2).map((p) => (
                    <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {p.split('_')[1]}
                    </span>
                  ))}
                  {key.permissions.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{key.permissions.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(key.lastUsed)}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  key.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                )}>
                  {key.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(key)} className="text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(key)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};