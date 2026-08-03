import { useState } from 'react';
import { Zap, Trash2, RefreshCw, Download, Stethoscope, Loader2 } from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { cn } from '../../utils/settings.helpers';

export const DeveloperQuickActions = () => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoadingAction(action);
    try {
      await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { action });
    } catch (e) {
      // Graceful fallback for Phase 1 stub
    }
    // Simulate network delay for UI feedback
    await new Promise(r => setTimeout(r, 1000));
    setLoadingAction(null);
  };

  const actions = [
    { id: 'clear_cache', label: 'Clear Cache', icon: Trash2, variant: 'default' },
    { id: 'restart_queue', label: 'Restart Queue', icon: RefreshCw, variant: 'default' },
    { id: 'restart_workers', label: 'Restart Workers', icon: Zap, variant: 'default' },
    { id: 'export_diagnostics', label: 'Export Diagnostics', icon: Download, variant: 'default' },
    { id: 'health_check', label: 'Run Health Check', icon: Stethoscope, variant: 'primary' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const isLoading = loadingAction === action.id;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={!!loadingAction}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                action.variant === 'primary'
                  ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <action.icon className="h-4 w-4" />
              )}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};