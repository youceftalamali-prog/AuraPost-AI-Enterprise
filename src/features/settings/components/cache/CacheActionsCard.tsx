import { useState } from 'react';
import { Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react';

interface Props {
  onAction: (action: string) => void;
}

export const CacheActionsCard = ({ onAction }: Props) => {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const actions = [
    { id: 'clear_all', label: 'Clear All Cache', icon: Trash2, variant: 'danger' },
    { id: 'clear_redis', label: 'Clear Redis', icon: Trash2, variant: 'default' },
    { id: 'clear_memory', label: 'Clear Memory', icon: Trash2, variant: 'default' },
    { id: 'clear_cdn', label: 'Clear CDN', icon: Trash2, variant: 'default' },
    { id: 'clear_browser', label: 'Clear Browser', icon: Trash2, variant: 'default' },
    { id: 'invalidate_selected', label: 'Invalidate Selected', icon: X, variant: 'default' },
    { id: 'refresh_stats', label: 'Refresh Statistics', icon: RefreshCw, variant: 'primary' },
  ];

  const handleConfirm = () => {
    if (confirmAction) {
      onAction(confirmAction);
      setConfirmAction(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Cache Actions</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => action.id === 'refresh_stats' ? onAction(action.id) : setConfirmAction(action.id)}
            className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              action.variant === 'danger'
                ? 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 hover:bg-red-500/10'
                : action.variant === 'primary'
                ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Confirm Action</h3>
              <button onClick={() => setConfirmAction(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-muted-foreground">
                Are you sure you want to execute <strong className="text-foreground">{actions.find(a => a.id === confirmAction)?.label}</strong>? This action may temporarily impact performance.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
              <button onClick={handleConfirm} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};