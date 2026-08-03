import { ChevronDown, ChevronUp } from 'lucide-react';
import { WebhookLog } from '../../types/api.types';
import { cn } from '../../utils/settings.helpers';
import { formatBytes } from '../../utils/api.helpers';
import { useState } from 'react';

interface Props {
  logs: WebhookLog[];
}

export const WebhookHistoryTable = ({ logs }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="w-8 px-4 py-3"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => (
            <>
              <tr key={log.id} className="transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                <td className="px-4 py-3 text-muted-foreground">
                  {expandedId === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-foreground">{log.event}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  )}>
                    {log.responseCode} {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.duration}ms</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.ip}</td>
              </tr>
              {expandedId === log.id && (
                <tr className="bg-muted/10">
                  <td colSpan={6} className="p-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold text-foreground">Payload Size</p>
                        <p className="text-muted-foreground">{formatBytes(log.payloadSize)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Retry Count</p>
                        <p className="text-muted-foreground">{log.retryCount}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};