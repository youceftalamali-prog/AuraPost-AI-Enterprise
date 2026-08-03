import { X, AlertTriangle } from 'lucide-react';
import { Integration } from '../../pages/IntegrationsSettings';

interface Props {
  integration: Integration;
  isOpen: boolean;
  onClose: () => void;
  onDisconnect: (id: Integration['id']) => void;
}

export const DisconnectDialog = ({ integration, isOpen, onClose, onDisconnect }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Disconnect {integration.name}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-muted-foreground">
            Disconnecting <strong className="text-foreground">{integration.name}</strong> will stop all sync operations 
            and revoke API access. Existing synced data will remain but will no longer update.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => { onDisconnect(integration.id); onClose(); }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};