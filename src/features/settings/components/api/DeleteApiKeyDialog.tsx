import { X, AlertTriangle } from 'lucide-react';
import { ApiKey } from '../../types/api.types';

interface Props {
  keyToDelete: ApiKey | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const DeleteApiKeyDialog = ({ keyToDelete, onClose, onDelete }: Props) => {
  if (!keyToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Delete API Key</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">This action cannot be undone.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Any application using the key <strong>{keyToDelete.name}</strong> will immediately lose access.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => { onDelete(keyToDelete.id); onClose(); }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            Delete Key
          </button>
        </div>
      </div>
    </div>
  );
};