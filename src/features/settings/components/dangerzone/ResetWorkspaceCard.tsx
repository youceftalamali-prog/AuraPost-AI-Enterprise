import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { ConfirmationDialog } from './ConfirmationDialog';

export const ResetWorkspaceCard = () => {
  const { setDirty } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [keepData, setKeepData] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const canReset = reason.trim().length > 0;

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'reset_workspace',
        keepData,
        reason,
      });
      setTimeout(() => {
        setIsLoading(false);
        setIsDialogOpen(false);
        setReason('');
        setDirty(true);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border-2 border-amber-500/30 bg-background p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Reset Workspace</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reset all workspace settings to default values. Optionally keep your data.
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Reset workspace settings
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Reset Workspace Settings"
        message="This will reset all configuration settings to their default values."
        confirmText="Reset Settings"
        isLoading={isLoading}
        variant="warning"
        onConfirm={handleReset}
        onCancel={() => {
          setIsDialogOpen(false);
          setReason('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Reason for reset (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you're resetting the workspace..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="keepData"
              checked={keepData}
              onChange={(e) => setKeepData(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="keepData" className="text-sm text-foreground">
              Keep all data (projects, assets, users)
            </label>
          </div>
          {!keepData && (
            <div className="rounded-md bg-red-500/10 p-3">
              <p className="text-xs text-red-600 dark:text-red-400">
                Warning: Unchecking this will delete all workspace data permanently.
              </p>
            </div>
          )}
        </div>
      </ConfirmationDialog>
    </>
  );
};