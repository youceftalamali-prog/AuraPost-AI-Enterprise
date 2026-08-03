import { useSettings } from '../hooks/useSettings';
import { useSaveSettings } from '../hooks/useSaveSettings';
import { cn } from '../utils/settings.helpers';

export const SettingsSaveBar = () => {
  const { isDirty, isSaving, setDirty } = useSettings();
  const { save } = useSaveSettings();

  return (
    <div
      className={cn(
        'flex h-16 shrink-0 items-center justify-between border-t border-border bg-background px-8 transition-transform duration-200 ease-in-out',
        isDirty ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
    >
      <p className="text-sm text-muted-foreground">
        You have unsaved changes.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDirty(false)}
          disabled={isSaving}
          className="rounded-md px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          Discard
        </button>

        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};