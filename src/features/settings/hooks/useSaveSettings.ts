import { useCallback } from 'react';
import { useSettings } from './useSettings';
import { useSettingsToast } from './useSettingsToast';

export const useSaveSettings = () => {
  const { setDirty, setSaving, isSaving } = useSettings();
  const { showSuccess, showError } = useSettingsToast();

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const savePromise = new Promise<void>((resolve, reject) => {
        const handler = (e: any) => {
          window.removeEventListener('settings:save:response', handler);
          if (e.detail.success) resolve();
          else reject(e.detail.error);
        };
        window.addEventListener('settings:save:response', handler);
      });

      window.dispatchEvent(new CustomEvent('settings:save'));
      await savePromise;

      setDirty(false);
      showSuccess('Settings saved successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [setDirty, setSaving, showSuccess, showError]);

  return { save, isSaving };
};