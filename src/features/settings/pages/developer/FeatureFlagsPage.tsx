import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { FeatureFlag, FlagEnvironment, FlagCategory, FlagHistoryEntry } from '../../types/featureFlags.types';
import { FeatureFlagsOverview } from '../../components/developer/feature-flags/FeatureFlagsOverview';
import { FeatureFlagFilters } from '../../components/developer/feature-flags/FeatureFlagFilters';
import { FeatureFlagTable } from '../../components/developer/feature-flags/FeatureFlagTable';
import { FeatureFlagDialog } from '../../components/developer/feature-flags/FeatureFlagDialog';
import { FeatureFlagHistory } from '../../components/developer/feature-flags/FeatureFlagHistory';
import { Plus, Download, Upload, Activity, Calendar, RefreshCw } from 'lucide-react';

const MOCK_FLAGS: FeatureFlag[] = [
  { id: '1', name: 'New AI Canvas', key: 'ai_canvas_v2', description: 'Experimental canvas editor', environment: 'production', category: 'ai', status: 'enabled', rolloutPercentage: 50, targetRoles: ['beta_testers'], expirationDate: null, dependencies: [], killSwitch: false, owner: 'admin', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-26T10:00:00Z' },
  { id: '2', name: 'Dark Mode Beta', key: 'ui_dark_mode', description: 'Dark mode support', environment: 'staging', category: 'beta', status: 'enabled', rolloutPercentage: 100, targetRoles: [], expirationDate: null, dependencies: [], killSwitch: false, owner: 'design_team', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-25T14:00:00Z' },
  { id: '3', name: 'Legacy API', key: 'api_v1_legacy', description: 'Keep legacy API alive', environment: 'production', category: 'security', status: 'disabled', rolloutPercentage: 0, targetRoles: [], expirationDate: '2026-03-01', dependencies: [], killSwitch: true, owner: 'dev_ops', createdAt: '2025-12-01T00:00:00Z', updatedAt: '2026-01-20T09:00:00Z' },
];

const MOCK_HISTORY: FlagHistoryEntry[] = [
  { id: 'h1', flagId: '1', timestamp: '2026-01-26T10:00:00Z', user: 'admin@company.com', action: 'updated rollout', oldValue: '25%', newValue: '50%', reason: 'Positive feedback from beta group' },
  { id: 'h2', flagId: '2', timestamp: '2026-01-25T14:00:00Z', user: 'design@company.com', action: 'enabled flag', oldValue: 'disabled', newValue: 'enabled', reason: 'Ready for staging review' },
];

export const FeatureFlagsPage = () => {
  const { setDirty } = useSettings();
  const [flags, setFlags] = useState<FeatureFlag[]>(MOCK_FLAGS);
  const [history] = useState<FlagHistoryEntry[]>(MOCK_HISTORY);
  
  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState<FlagEnvironment | 'all'>('all');
  const [catFilter, setCatFilter] = useState<FlagCategory | 'all'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);

  useEffect(() => {
    // No dirty state for simple toggles usually, but if we edit forms we might. 
    // For this phase, we assume immediate save on toggle/edit.
  }, []);

  const filteredFlags = flags.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase());
    const matchEnv = envFilter === 'all' || f.environment === envFilter;
    const matchCat = catFilter === 'all' || f.category === catFilter;
    return matchSearch && matchEnv && matchCat;
  });

  const handleToggle = async (id: string) => {
    const flag = flags.find(f => f.id === id);
    if (!flag) return;
    const newStatus = flag.status === 'enabled' ? 'disabled' : 'enabled';
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { module: 'feature_flags', action: 'toggle', id, status: newStatus }); } catch(e){}
    setFlags(prev => prev.map(f => f.id === id ? { ...f, status: newStatus as any, updatedAt: new Date().toISOString() } : f));
  };

  const handleSave = async (data: Partial<FeatureFlag>) => {
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { module: 'feature_flags', action: dialogMode, data }); } catch(e){}
    
    if (dialogMode === 'edit' && selectedFlag) {
      setFlags(prev => prev.map(f => f.id === selectedFlag.id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f));
    } else {
      const newFlag: FeatureFlag = {
        id: Date.now().toString(),
        name: data.name || 'New Flag',
        key: data.key || 'new_flag',
        description: data.description || '',
        environment: data.environment || 'development',
        category: data.category || 'experimental',
        status: 'disabled',
        rolloutPercentage: data.rolloutPercentage || 0,
        targetRoles: [],
        expirationDate: null,
        dependencies: [],
        killSwitch: false,
        owner: 'current_user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFlags(prev => [newFlag, ...prev]);
    }
    setDialogOpen(false);
    setSelectedFlag(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { module: 'feature_flags', action: 'delete', id }); } catch(e){}
    setFlags(prev => prev.filter(f => f.id !== id));
  };

  const openCreate = () => { setDialogMode('create'); setSelectedFlag(null); setDialogOpen(true); };
  const openEdit = (flag: FeatureFlag) => { setDialogMode('edit'); setSelectedFlag(flag); setDialogOpen(true); };
  const openClone = (flag: FeatureFlag) => { setDialogMode('clone'); setSelectedFlag(flag); setDialogOpen(true); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Feature Flags</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage feature toggles, rollouts, and experiments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create Flag
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FeatureFlagsOverview flags={flags} />
          <FeatureFlagFilters search={search} setSearch={setSearch} envFilter={envFilter} setEnvFilter={setEnvFilter} catFilter={catFilter} setCatFilter={setCatFilter} />
          <FeatureFlagTable flags={filteredFlags} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onClone={openClone} />
        </div>
        <div className="space-y-6">
           <div className="rounded-lg border border-border bg-background p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">System Status</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Activity className="h-4 w-4" /> Health</span>
                    <span className="font-medium text-emerald-500">Operational</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> Last Deployment</span>
                    <span className="font-medium text-foreground">2 hours ago</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="h-4 w-4" /> Last Sync</span>
                    <span className="font-medium text-foreground">Just now</span>
                 </div>
              </div>
           </div>
           <FeatureFlagHistory history={history} />
        </div>
      </div>

      <FeatureFlagDialog isOpen={dialogOpen} mode={dialogMode} flag={selectedFlag} onClose={() => setDialogOpen(false)} onSave={handleSave} />
    </div>
  );
};