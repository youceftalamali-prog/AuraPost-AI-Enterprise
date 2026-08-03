import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelSubscriptionDialog = ({ isOpen, onClose, onConfirm }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Cancel Subscription</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">This action cannot be undone.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your workspace will be downgraded to the Free plan at the end of the current billing cycle. 
              All premium features and excess storage will be suspended.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Keep Subscription
          </button>
          <button onClick={onConfirm} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
};