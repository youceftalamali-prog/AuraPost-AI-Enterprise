import { Plus } from 'lucide-react';
import { Webhook } from '../../types/api.types';
import { WebhookTable } from './WebhookTable';

interface Props {
  webhooks: Webhook[];
  onCreate: () => void;
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
  onLogs: (webhook: Webhook) => void;
}

export const WebhookCard = ({ webhooks, onCreate, onEdit, onDelete, onLogs }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Webhooks</h3>
          <p className="text-xs text-muted-foreground">Receive real-time notifications when events occur.</p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Endpoint
        </button>
      </div>
      <WebhookTable webhooks={webhooks} onEdit={onEdit} onDelete={onDelete} onLogs={onLogs} />
    </div>
  );
};