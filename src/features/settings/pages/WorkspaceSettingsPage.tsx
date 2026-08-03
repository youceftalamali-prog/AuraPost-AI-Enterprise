import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { WorkspaceSettings } from '../types/workspace.types';
import { WorkspaceProfileForm } from '../components/workspace/WorkspaceProfileForm';
import { WorkspaceLocaleForm } from '../components/workspace/WorkspaceLocaleForm';

export const WorkspaceSettingsPage = () => {
  const { setDirty } = useSettings();
  const { data, isLoading, updateData, setData } = useModuleData<WorkspaceSettings>(SettingsModule.WORKSPACE);

  const updateField = async <K extends keyof WorkspaceSettings>(field: K, value: WorkspaceSettings[K]) => {
    if (!data) return;
    const newData = { ...data, [field]: value };
    setData(newData);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!data) return;
    await updateData(data);
    setDirty(false);
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-96 rounded-md bg-muted" />
        <div className="h-64 rounded-lg border border-border bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace profile, localization, and preferences.</p>
      </div>
      <WorkspaceProfileForm data={data} updateField={updateField} />
      <WorkspaceLocaleForm data={data} updateField={updateField} />
    </div>
  );
};