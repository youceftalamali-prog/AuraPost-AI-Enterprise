import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { ConfirmationDialog } from './ConfirmationDialog';

export const ArchiveWorkspaceCard = () => {
  const { setDirty } = useSettings();
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  const canArchive = reason.trim().length > 0;

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'archive_workspace',
        reason,
      });
      setTimeout(() => {
        setIsLoading(false);
        setIsArchiveDialogOpen(false);
        setReason('');
        setIsArchived(true);
        setDirty(true);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'restore_workspace',
      });
      setTimeout(() => {
        setIsLoading(false);
        setIsRestoreDialogOpen(false);
        setIsArchived(false);
        setDirty(true);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border-2 border-gray-500/30 bg-background p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
            {isArchived ? (
              <ArchiveRestore className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Archive className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {isArchived ? 'Restore Workspace' : 'Archive Workspace'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isArchived
                ? 'Restore this workspace from archive. It will become active again.'
                : 'Archive this workspace. It will be hidden but can be restored later.'}
            </p>
            <button
              onClick={() => isArchived ? setIsRestoreDialogOpen(true) : setIsArchiveDialogOpen(true)}
              className="mt-4 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              {isArchived ? 'Restore workspace' : 'Archive workspace'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        title="Archive Workspace"
        message="This workspace will be hidden from the dashboard but can be restored at any time."
        confirmText="Archive Workspace"
        isLoading={isLoading}
        variant="warning"
        onConfirm={handleArchive}
        onCancel={() => {
          setIsArchiveDialogOpen(false);
          setReason('');
        }}
      >
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Reason for archiving (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain why you're archiving this workspace..."
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        isOpen={isRestoreDialogOpen}
        title="Restore Workspace"
        message="This workspace will become active and visible in the dashboard again."
        confirmText="Restore Workspace"
        isLoading={isLoading}
        variant="warning"
        onConfirm={handleRestore}
        onCancel={() => setIsRestoreDialogOpen(false)}
      />
    </>
  );
};