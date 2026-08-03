import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { 
  LocalizationSettings, TimezoneSettings, WorkspaceDefaults, 
  WorkspaceBehavior, MaintenanceSettings, ExperimentalFeature 
} from '../types/system.types';
import { 
  MOCK_OVERVIEW, MOCK_LOCALIZATION, MOCK_TIMEZONE, MOCK_DEFAULTS, 
  MOCK_BEHAVIOR, MOCK_MAINTENANCE, MOCK_EXPERIMENTAL, MOCK_HEALTH 
} from '../utils/system.helpers';
import { SystemSkeleton } from '../components/system/SystemSkeleton';
import { SystemOverviewCard } from '../components/system/SystemOverviewCard';
import { LanguageCard } from '../components/system/LanguageCard';
import { RegionCard } from '../components/system/RegionCard';
import { DateTimeCard } from '../components/system/DateTimeCard';
import { TimezoneCard } from '../components/system/TimezoneCard';
import { LocalizationCard } from '../components/system/LocalizationCard';
import { WorkspaceDefaultsCard } from '../components/system/WorkspaceDefaultsCard';
import { WorkspaceBehaviorCard } from '../components/system/WorkspaceBehaviorCard';
import { SystemMaintenanceCard } from '../components/system/SystemMaintenanceCard';
import { ExperimentalFeaturesCard } from '../components/system/ExperimentalFeaturesCard';
import { SystemHealthCard } from '../components/system/SystemHealthCard';
import { DiagnosticsCard } from '../components/system/DiagnosticsCard';

export const SystemSettings = () => {
  const { setDirty } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  
  const [localization, setLocalization] = useState<LocalizationSettings>(MOCK_LOCALIZATION);
  const [timezone, setTimezone] = useState<TimezoneSettings>(MOCK_TIMEZONE);
  const [defaults, setDefaults] = useState<WorkspaceDefaults>(MOCK_DEFAULTS);
  const [behavior, setBehavior] = useState<WorkspaceBehavior>(MOCK_BEHAVIOR);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>(MOCK_MAINTENANCE);
  const [experimental, setExperimental] = useState<ExperimentalFeature[]>(MOCK_EXPERIMENTAL);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isDirty = 
      JSON.stringify(localization) !== JSON.stringify(MOCK_LOCALIZATION) ||
      JSON.stringify(timezone) !== JSON.stringify(MOCK_TIMEZONE) ||
      JSON.stringify(defaults) !== JSON.stringify(MOCK_DEFAULTS) ||
      JSON.stringify(behavior) !== JSON.stringify(MOCK_BEHAVIOR) ||
      JSON.stringify(maintenance) !== JSON.stringify(MOCK_MAINTENANCE) ||
      JSON.stringify(experimental) !== JSON.stringify(MOCK_EXPERIMENTAL);
    setDirty(isDirty);
  }, [localization, timezone, defaults, behavior, maintenance, experimental, setDirty]);

  const handleLocalizationChange = (updates: Partial<LocalizationSettings>) => setLocalization(prev => ({ ...prev, ...updates }));
  const handleRegionChange = (field: 'country' | 'currency', value: string) => setLocalization(prev => ({ ...prev, [field]: value }));
  const handleExperimentalToggle = (id: string) => setExperimental(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));

  if (isLoading) return <SystemSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">System</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage system localization, defaults, behavior, and maintenance.</p>
      </div>

      <SystemOverviewCard overview={MOCK_OVERVIEW} />
      <DiagnosticsCard />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <LanguageCard language={localization.language} onChange={(lang) => handleLocalizationChange({ language: lang })} />
        <RegionCard country={localization.country} currency={localization.currency} onChange={handleRegionChange} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DateTimeCard settings={localization} onChange={handleLocalizationChange} />
        <TimezoneCard settings={timezone} onChange={(u) => setTimezone(prev => ({ ...prev, ...u }))} />
      </div>

      <LocalizationCard settings={localization} onChange={handleLocalizationChange} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <WorkspaceDefaultsCard settings={defaults} onChange={(u) => setDefaults(prev => ({ ...prev, ...u }))} />
        <WorkspaceBehaviorCard settings={behavior} onChange={(u) => setBehavior(prev => ({ ...prev, ...u }))} />
      </div>

      <SystemMaintenanceCard settings={maintenance} onChange={(u) => setMaintenance(prev => ({ ...prev, ...u }))} />
      <ExperimentalFeaturesCard features={experimental} onToggle={handleExperimentalToggle} />
      <SystemHealthCard health={MOCK_HEALTH} />
    </div>
  );
};