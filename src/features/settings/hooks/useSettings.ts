import { useSettingsStore } from '../store/useSettingsStore';

export const useSettings = () => {
  const activeModule = useSettingsStore((s) => s.activeModule);
  const activeArea = useSettingsStore((s) => s.activeArea);
  const isDirty = useSettingsStore((s) => s.isDirty);
  const isSaving = useSettingsStore((s) => s.isSaving);
  const error = useSettingsStore((s) => s.error);
  const searchQuery = useSettingsStore((s) => s.searchQuery);

  const setActiveModule = useSettingsStore((s) => s.setActiveModule);
  const setActiveArea = useSettingsStore((s) => s.setActiveArea);
  const setDirty = useSettingsStore((s) => s.setDirty);
  const setSaving = useSettingsStore((s) => s.setSaving);
  const setError = useSettingsStore((s) => s.setError);
  const setSearchQuery = useSettingsStore((s) => s.setSearchQuery);
  const reset = useSettingsStore((s) => s.reset);

  return {
    activeModule,
    activeArea,
    isDirty,
    isSaving,
    error,
    searchQuery,
    setActiveModule,
    setActiveArea,
    setDirty,
    setSaving,
    setError,
    setSearchQuery,
    reset,
  };
};