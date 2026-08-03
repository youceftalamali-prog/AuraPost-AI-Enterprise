import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { 
  StorageProvider, StorageBucket, LifecyclePolicy, BackupSettings, 
  CleanupSettings, RetentionPolicies 
} from '../types/storage.types';
import { 
  MOCK_PROVIDERS, MOCK_BUCKETS, MOCK_LIFECYCLE, MOCK_BACKUP, 
  MOCK_CLEANUP, MOCK_RETENTION, MOCK_USAGE, MOCK_OVERVIEW, MOCK_HISTORY 
} from '../utils/storage.helpers';
import { StorageSkeleton } from '../components/storage/StorageSkeleton';
import { StorageOverviewCard } from '../components/storage/StorageOverviewCard';
import { StorageUsageCard } from '../components/storage/StorageUsageCard';
import { StorageProvidersCard } from '../components/storage/StorageProvidersCard';
import { StorageProviderDialog } from '../components/storage/StorageProviderDialog';
import { StorageBucketsCard } from '../components/storage/StorageBucketsCard';
import { StorageLifecycleCard } from '../components/storage/StorageLifecycleCard';
import { StorageBackupCard } from '../components/storage/StorageBackupCard';
import { StorageCleanupCard } from '../components/storage/StorageCleanupCard';
import { StorageRetentionCard } from '../components/storage/StorageRetentionCard';
import { StorageHistoryTable } from '../components/storage/StorageHistoryTable';

export const StorageSettings = () => {
  const { setDirty } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  
  const [providers, setProviders] = useState<StorageProvider[]>(MOCK_PROVIDERS);
  const [buckets, setBuckets] = useState<StorageBucket[]>(MOCK_BUCKETS);
  const [lifecycle, setLifecycle] = useState<LifecyclePolicy>(MOCK_LIFECYCLE);
  const [backup, setBackup] = useState<BackupSettings>(MOCK_BACKUP);
  const [cleanup, setCleanup] = useState<CleanupSettings>(MOCK_CLEANUP);
  const [retention, setRetention] = useState<RetentionPolicies>(MOCK_RETENTION);

  const [selectedProvider, setSelectedProvider] = useState<StorageProvider | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isDirty = 
      JSON.stringify(lifecycle) !== JSON.stringify(MOCK_LIFECYCLE) ||
      JSON.stringify(backup) !== JSON.stringify(MOCK_BACKUP) ||
      JSON.stringify(cleanup) !== JSON.stringify(MOCK_CLEANUP) ||
      JSON.stringify(retention) !== JSON.stringify(MOCK_RETENTION) ||
      JSON.stringify(buckets) !== JSON.stringify(MOCK_BUCKETS);
    setDirty(isDirty);
  }, [lifecycle, backup, cleanup, retention, buckets, setDirty]);

  const handleSaveProvider = async (id: string, data: any) => {
    try {
      await settingsApi.patch(SettingsModule.STORAGE, 'current', { action: 'save_provider', id, data });
    } catch (e) {}
    setProviders(prev => prev.map(p => p.id === id ? { ...p, connected: true, region: data.region } : p));
  };

  const handleToggleBucket = async (id: string, field: keyof StorageBucket) => {
    setBuckets(prev => prev.map(b => b.id === id ? { ...b, [field]: !b[field] } : b));
  };

  const handleRunCleanup = async () => {
    try {
      await settingsApi.patch(SettingsModule.STORAGE, 'current', { action: 'run_cleanup', settings: cleanup });
    } catch (e) {}
    setCleanup(prev => ({ ...prev, recoverableSpace: '0 GB' }));
  };

  const handleRunManualBackup = async () => {
    try {
      await settingsApi.patch(SettingsModule.STORAGE, 'current', { action: 'run_backup' });
    } catch (e) {}
  };

  if (isLoading) return <StorageSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Storage</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage storage providers, buckets, backups, and retention policies.</p>
      </div>

      <StorageOverviewCard overview={MOCK_OVERVIEW} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <StorageUsageCard usage={MOCK_USAGE} />
        <StorageProvidersCard providers={providers} onConfigure={setSelectedProvider} />
      </div>

      <StorageBucketsCard 
        buckets={buckets} 
        onToggle={handleToggleBucket} 
        onDelete={(id) => setBuckets(prev => prev.filter(b => b.id !== id))} 
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <StorageLifecycleCard policy={lifecycle} onChange={(u) => setLifecycle(prev => ({ ...prev, ...u }))} />
        <StorageBackupCard settings={backup} onChange={(u) => setBackup(prev => ({ ...prev, ...u }))} onRunManual={handleRunManualBackup} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <StorageCleanupCard settings={cleanup} onChange={(u) => setCleanup(prev => ({ ...prev, ...u }))} onRunCleanup={handleRunCleanup} />
        <StorageRetentionCard policies={retention} onChange={(u) => setRetention(prev => ({ ...prev, ...u }))} />
      </div>

      <StorageHistoryTable history={MOCK_HISTORY} />

      {selectedProvider && (
        <StorageProviderDialog 
          provider={selectedProvider} 
          onClose={() => setSelectedProvider(null)} 
          onSave={handleSaveProvider} 
        />
      )}
    </div>
  );
};