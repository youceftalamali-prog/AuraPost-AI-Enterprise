import { X } from 'lucide-react';
import { Webhook, WebhookLog } from '../../types/api.types';
import { WebhookHistoryTable } from './WebhookHistoryTable';

interface Props {
  webhook: Webhook | null;
  logs: WebhookLog[];
  onClose: () => void;
}

export const WebhookLogsDialog = ({ webhook, logs, onClose }: Props) => {
  if (!webhook) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Delivery Logs: {webhook.url}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 max-h-[60vh] overflow-y-auto rounded-lg border border-border">
          <WebhookHistoryTable logs={logs} />
        </div>
      </div>
    </div>
  );
};