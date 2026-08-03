import { Edit2, Trash2, History } from 'lucide-react';
import { Webhook } from '../../types/api.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  webhooks: Webhook[];
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
  onLogs: (webhook: Webhook) => void;
}

export const WebhookTable = ({ webhooks, onEdit, onDelete, onLogs }: Props) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endpoint</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Rate</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {webhooks.map((wh) => (
            <tr key={wh.id} className="transition-colors hover:bg-muted/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs text-foreground truncate max-w-xs">
                  {wh.url}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {wh.events.slice(0, 2).map((e) => (
                    <span key={e} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {e.split('.')[1]}
                    </span>
                  ))}
                  {wh.events.length > 2 && <span className="text-xs text-muted-foreground">+{wh.events.length - 2}</span>}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  wh.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                )}>
                  {wh.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-foreground">{wh.successRate}%</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onLogs(wh)} className="text-muted-foreground hover:text-foreground" title="View Logs">
                    <History className="h-4 w-4" />
                  </button>
                  <button onClick={() => onEdit(wh)} className="text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(wh)} className="text-muted-foreground hover:text-red-500">
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