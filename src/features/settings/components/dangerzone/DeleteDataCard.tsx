import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { DeleteDataOptions } from '../../types/dangerzone.types';

export const DeleteDataCard = () => {
  const { setDirty } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [options, setOptions] = useState<DeleteDataOptions>({
    logs: false,
    analytics: false,
    uploads: false,
    cache: false,
  });
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const hasSelection = Object.values(options).some(v => v);
  const canDelete = hasSelection && confirmationChecked;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'delete_data',
        options,
      });
      setTimeout(() => {
        setIsLoading(false);
        setIsDialogOpen(false);
        setOptions({ logs: false, analytics: false, uploads: false, cache: false });
        setConfirmationChecked(false);
        setDirty(true);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const deleteOptions = [
    { key: 'logs', label: 'System Logs', desc: 'Application and error logs' },
    { key: 'analytics', label: 'Analytics Data', desc: 'Usage statistics and metrics' },
    { key: 'uploads', label: 'Temporary Uploads', desc: 'Unprocessed uploaded files' },
    { key: 'cache', label: 'Cache Data', desc: 'Cached files and temporary data' },
  ];

  return (
    <>
      <div className="rounded-lg border-2 border-red-500/30 bg-background p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Delete Specific Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Selectively delete logs, analytics, uploads, or cache without affecting other data.
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete data
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Delete Specific Data"
        message="Select the data categories you want to permanently delete."
        confirmText="Delete Selected Data"
        isLoading={isLoading}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDialogOpen(false);
          setOptions({ logs: false, analytics: false, uploads: false, cache: false });
          setConfirmationChecked(false);
        }}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            {deleteOptions.map(opt => (
              <div key={opt.key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={opt.key}
                  checked={options[opt.key as keyof DeleteDataOptions]}
                  onChange={(e) => setOptions({ ...options, [opt.key]: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <label htmlFor={opt.key} className="flex-1">
                  <div className="text-sm font-medium text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </label>
              </div>
            ))}
          </div>
          
          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirmDelete"
                checked={confirmationChecked}
                onChange={(e) => setConfirmationChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <label htmlFor="confirmDelete" className="text-sm text-foreground">
                I understand that this action is irreversible and will permanently delete the selected data.
              </label>
            </div>
          </div>

          {!canDelete && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Please select at least one data category and confirm the deletion.
            </p>
          )}
        </div>
      </ConfirmationDialog>
    </>
  );
};