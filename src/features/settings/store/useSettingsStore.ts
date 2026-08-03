import { create } from 'zustand';
import { SettingsState, SettingsArea } from '../types/settings.types';

const initialState = {
  activeModule: null,
  activeArea: SettingsArea.CLIENT,
  isDirty: false,
  isSaving: false,
  error: null,
  searchQuery: '',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initialState,

  setActiveModule: (module) => set({ activeModule: module, error: null }),

  setActiveArea: (area) =>
    set({ activeArea: area, activeModule: null, searchQuery: '' }),

  setDirty: (isDirty) => set({ isDirty }),

  setSaving: (isSaving) => set({ isSaving }),

  setError: (error) => set({ error }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  reset: () => set(initialState),
}));