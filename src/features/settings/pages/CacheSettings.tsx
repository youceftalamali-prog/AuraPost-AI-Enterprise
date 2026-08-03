import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { CacheStatistics } from '../components/cache/CacheStatistics';
import { CacheOverview } from '../components/cache/CacheOverview';
import { CacheProvidersTable } from '../components/cache/CacheProvidersTable';
import { CacheKeysTable } from '../components/cache/CacheKeysTable';
import { CacheActionsCard } from '../components/cache/CacheActionsCard';
import { CacheWarmupCard } from '../components/cache/CacheWarmupCard';
import { CachePolicyCard } from '../components/cache/CachePolicyCard';
import { CacheHistoryTable } from '../components/cache/CacheHistoryTable';

const MOCK_STATS = { totalSize: '2.4 GB', cachedObjects: 145230, hitRate: 94.5, missRate: 5.5, evictions: 1240, expiredKeys: 340 };
const MOCK_OVERVIEW = { memoryUsage: '1.8 GB / 4.0 GB', redisStatus: 'healthy' as const, localCache: 'healthy' as const, cdnCache: 'warning' as const, responseTime: '12ms' };
const MOCK_PROVIDERS = [
  { id: '1', name: 'Redis', status: 'healthy' as const, memory: '1.2 GB', objects: 85000, latency: '2ms' },
  { id: '2', name: 'Memory', status: 'healthy' as const, memory: '400 MB', objects: 12000, latency: '<1ms' },
  { id: '3', name: 'Disk', status: 'warning' as const, memory: '800 MB', objects: 45000, latency: '45ms' },
  { id: '4', name: 'CDN', status: 'healthy' as const, memory: 'N/A', objects: 3200, latency: '15ms' },
  { id: '5', name: 'Browser', status: 'offline' as const, memory: 'N/A', objects: 0, latency: 'N/A' },
];
const MOCK_KEYS = [
  { id: '1', key: 'user:123:profile', namespace: 'users', size: '4.2 KB', ttl: '3600s', lastAccess: '2026-01-26T12:00:00Z', status: 'active' as const },
  { id: '2', key: 'product:456:images', namespace: 'products', size: '12.5 KB', ttl: '86400s', lastAccess: '2026-01-26T11:55:00Z', status: 'active' as const },
  { id: '3', key: 'api:feed:page:1', namespace: 'api', size: '120 KB', ttl: '60s', lastAccess: '2026-01-26T11:50:00Z', status: 'expired' as const },
  { id: '4', key: 'session:789:token', namespace: 'auth', size: '1.1 KB', ttl: '1800s', lastAccess: '2026-01-26T11:45:00Z', status: 'evicted' as const },
];
const MOCK_WARMUP = { enabled: true, homepage: true, products: true, api: false, images: true, interval: 60 };
const MOCK_POLICY = { defaultTtl: 3600, imageTtl: 86400, apiTtl: 60, staticTtl: 2592000, compression: true, autoCleanup: true, smartEviction: true, maxSize: 4096 };
const MOCK_HISTORY = [
  { id: '1', time: '2026-01-26T12:05:00Z', action: 'Clear All Cache', target: 'Global', user: 'admin@company.com', result: 'success' as const },
  { id: '2', time: '2026-01-26T10:00:00Z', action: 'Warmup', target: 'Products', user: 'System', result: 'success' as const },
  { id: '3', time: '2026-01-25T18:00:00Z', action: 'Flush Redis', target: 'Redis', user: 'admin@company.com', result: 'failed' as const },
];

export const CacheSettings = () => {
  const { setDirty } = useSettings();
  const [warmup, setWarmup] = useState(MOCK_WARMUP);
  const [policy, setPolicy] = useState(MOCK_POLICY);

  useEffect(() => {
    const isDirty = JSON.stringify(warmup) !== JSON.stringify(MOCK_WARMUP) || JSON.stringify(policy) !== JSON.stringify(MOCK_POLICY);
    setDirty(isDirty);
  }, [warmup, policy, setDirty]);

  const handleAction = async (action: string) => {
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { module: 'cache', action }); } catch(e){}
  };

  const handleProviderAction = async (id: string, action: string) => {
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { module: 'cache', action: `provider_${action}`, providerId: id }); } catch(e){}
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Cache Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">Monitor cache performance, manage providers, and configure eviction policies.</p>
      </div>

      <CacheStatistics stats={MOCK_STATS} />
      <CacheOverview data={MOCK_OVERVIEW} />
      <CacheProvidersTable providers={MOCK_PROVIDERS} onAction={handleProviderAction} />
      <CacheKeysTable keys={MOCK_KEYS} />
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <CacheWarmupCard settings={warmup} onChange={(u) => setWarmup(prev => ({ ...prev, ...u }))} onManual={() => handleAction('manual_warmup')} />
        <CachePolicyCard settings={policy} onChange={(u) => setPolicy(prev => ({ ...prev, ...u }))} />
      </div>

      <CacheActionsCard onAction={handleAction} />
      <CacheHistoryTable history={MOCK_HISTORY} />
    </div>
  );
};