import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { MOCK_WORKSPACE_NAME } from '../../utils/dangerzone.helpers';

export const DeleteWorkspaceCard = () => {
  const { setDirty } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canDelete = confirmationText === MOCK_WORKSPACE_NAME && reason.trim().length > 0;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'delete_workspace',
        reason,
      });
      setTimeout(() => {
        setIsLoading(false);
        setIsDialogOpen(false);
        setConfirmationText('');
        setReason('');
        setDirty(true);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border-2 border-red-500/30 bg-background p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Delete Workspace</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete this workspace and all its data. This action cannot be undone.
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete this workspace
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Delete Workspace"
        message="This will permanently delete the workspace and all associated data including projects, assets, and settings."
        confirmText="Delete Workspace"
        isLoading={isLoading}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDialogOpen(false);
          setConfirmationText('');
          setReason('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Reason for deletion (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you're deleting this workspace..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Type <strong className="font-mono">{MOCK_WORKSPACE_NAME}</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={MOCK_WORKSPACE_NAME}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          {!canDelete && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Please provide a reason and type the workspace name exactly to proceed.
            </p>
          )}
        </div>
      </ConfirmationDialog>
    </>
  );
};