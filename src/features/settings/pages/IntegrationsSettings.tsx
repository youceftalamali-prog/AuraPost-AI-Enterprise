import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { IntegrationCard } from '../components/integrations/IntegrationCard';
import { ConnectDialog } from '../components/integrations/ConnectDialog';
import { DisconnectDialog } from '../components/integrations/DisconnectDialog';
import { SyncHistoryTable } from '../components/integrations/SyncHistoryTable';
import { 
  ShoppingBag, Store, Video, Facebook, Globe, CreditCard, 
  MessageSquare, MessageCircle, Zap, Webhook, LucideIcon 
} from 'lucide-react';

export type IntegrationId = 'shopify' | 'woocommerce' | 'tiktok' | 'meta' | 'google' | 'stripe' | 'slack' | 'discord' | 'zapier' | 'webhooks';
export type IntegrationHealth = 'healthy' | 'warning' | 'error' | 'disconnected' | 'syncing';

export interface Integration {
  id: IntegrationId;
  name: string;
  description: string;
  icon: LucideIcon;
  status: 'connected' | 'disconnected';
  health: IntegrationHealth;
  connectedAccount: string | null;
  lastSync: string | null;
  version: string;
  autoSync: boolean;
  failedSyncCount: number;
}

export interface SyncHistoryEntry {
  id: string;
  date: string;
  integration: IntegrationId;
  operation: string;
  duration: string;
  status: 'success' | 'failed' | 'partial';
  trigger: 'manual' | 'auto' | 'webhook';
  result: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'shopify', name: 'Shopify', description: 'Sync products and orders', icon: Store, status: 'connected', health: 'healthy', connectedAccount: 'my-store.myshopify.com', lastSync: '2026-01-26T10:00:00Z', version: '2.4.1', autoSync: true, failedSyncCount: 0 },
  { id: 'woocommerce', name: 'WooCommerce', description: 'WordPress e-commerce sync', icon: ShoppingBag, status: 'connected', health: 'warning', connectedAccount: 'wp-store.com', lastSync: '2026-01-25T14:00:00Z', version: '1.8.0', autoSync: true, failedSyncCount: 2 },
  { id: 'tiktok', name: 'TikTok', description: 'Publish videos and analytics', icon: Video, status: 'connected', health: 'healthy', connectedAccount: '@aurapost', lastSync: '2026-01-26T08:00:00Z', version: '1.2.0', autoSync: true, failedSyncCount: 0 },
  { id: 'meta', name: 'Meta', description: 'Facebook & Instagram', icon: Facebook, status: 'disconnected', health: 'disconnected', connectedAccount: null, lastSync: null, version: '3.1.0', autoSync: false, failedSyncCount: 0 },
  { id: 'google', name: 'Google', description: 'Workspace & Analytics', icon: Globe, status: 'connected', health: 'error', connectedAccount: 'admin@company.com', lastSync: '2026-01-20T09:00:00Z', version: '2.0.5', autoSync: false, failedSyncCount: 5 },
  { id: 'stripe', name: 'Stripe', description: 'Payments and billing', icon: CreditCard, status: 'connected', health: 'healthy', connectedAccount: 'acct_12345', lastSync: '2026-01-26T12:00:00Z', version: '4.0.0', autoSync: true, failedSyncCount: 0 },
  { id: 'slack', name: 'Slack', description: 'Notifications and alerts', icon: MessageSquare, status: 'disconnected', health: 'disconnected', connectedAccount: null, lastSync: null, version: '1.5.2', autoSync: false, failedSyncCount: 0 },
  { id: 'discord', name: 'Discord', description: 'Community webhooks', icon: MessageCircle, status: 'connected', health: 'healthy', connectedAccount: 'AuraPost Server', lastSync: '2026-01-26T11:30:00Z', version: '1.1.0', autoSync: true, failedSyncCount: 0 },
  { id: 'zapier', name: 'Zapier', description: 'Automate workflows', icon: Zap, status: 'disconnected', health: 'disconnected', connectedAccount: null, lastSync: null, version: '2.2.1', autoSync: false, failedSyncCount: 0 },
  { id: 'webhooks', name: 'Webhooks', description: 'Custom HTTP endpoints', icon: Webhook, status: 'connected', health: 'healthy', connectedAccount: '3 active endpoints', lastSync: '2026-01-26T12:05:00Z', version: '1.0.0', autoSync: false, failedSyncCount: 0 },
];

const MOCK_HISTORY: SyncHistoryEntry[] = [
  { id: '1', date: '2026-01-26T12:05:00Z', integration: 'webhooks', operation: 'POST /order-created', duration: '120ms', status: 'success', trigger: 'auto', result: '200 OK' },
  { id: '2', date: '2026-01-26T12:00:00Z', integration: 'stripe', operation: 'Fetch Invoices', duration: '1.2s', status: 'success', trigger: 'auto', result: '14 records synced' },
  { id: '3', date: '2026-01-26T10:00:00Z', integration: 'shopify', operation: 'Sync Products', duration: '4.5s', status: 'success', trigger: 'manual', result: '142 products updated' },
  { id: '4', date: '2026-01-25T14:00:00Z', integration: 'woocommerce', operation: 'Sync Inventory', duration: '8.1s', status: 'partial', trigger: 'auto', result: '45/50 items synced' },
  { id: '5', date: '2026-01-20T09:00:00Z', integration: 'google', operation: 'Fetch Analytics', duration: '2.3s', status: 'failed', trigger: 'auto', result: '401 Unauthorized' },
];

export const IntegrationsSettings = () => {
  const { setDirty } = useSettings();
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  
  const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<Integration | null>(null);

  useEffect(() => {
    const isDirty = JSON.stringify(integrations) !== JSON.stringify(INITIAL_INTEGRATIONS);
    setDirty(isDirty);
  }, [integrations, setDirty]);

  const handleConnect = async (id: IntegrationId, credentials: any) => {
    try {
      await settingsApi.patch(SettingsModule.INTEGRATIONS, 'current', { action: 'connect', integrationId: id, credentials });
    } catch (e) { /* fallback */ }
    setIntegrations(prev => prev.map(intg => intg.id === id ? {
      ...intg, status: 'connected', health: 'healthy',
      connectedAccount: credentials.workspace || credentials.apiKey?.slice(0, 10) + '...',
      lastSync: new Date().toISOString(), failedSyncCount: 0
    } : intg));
    setConnectTarget(null);
  };

  const handleDisconnect = async (id: IntegrationId) => {
    try {
      await settingsApi.patch(SettingsModule.INTEGRATIONS, 'current', { action: 'disconnect', integrationId: id });
    } catch (e) { /* fallback */ }
    setIntegrations(prev => prev.map(intg => intg.id === id ? {
      ...intg, status: 'disconnected', health: 'disconnected',
      connectedAccount: null, lastSync: null, autoSync: false, failedSyncCount: 0
    } : intg));
    setDisconnectTarget(null);
  };

  const handleSync = async (id: IntegrationId) => {
    setIntegrations(prev => prev.map(intg => intg.id === id ? { ...intg, health: 'syncing' } : intg));
    try {
      await settingsApi.patch(SettingsModule.INTEGRATIONS, 'current', { action: 'sync', integrationId: id });
    } catch (e) { /* fallback */ }
    await new Promise(r => setTimeout(r, 1500));
    setIntegrations(prev => prev.map(intg => intg.id === id ? { 
      ...intg, health: 'healthy', lastSync: new Date().toISOString(), failedSyncCount: 0
    } : intg));
  };

  const handleToggleAutoSync = (id: IntegrationId) => {
    setIntegrations(prev => prev.map(intg => intg.id === id ? { ...intg, autoSync: !intg.autoSync } : intg));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">Connect and manage third-party applications and services.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map(intg => (
          <IntegrationCard
            key={intg.id}
            integration={intg}
            onConnect={() => setConnectTarget(intg)}
            onDisconnect={() => setDisconnectTarget(intg)}
            onSync={() => handleSync(intg.id)}
            onConfigure={() => {}}
            onToggleAutoSync={() => handleToggleAutoSync(intg.id)}
          />
        ))}
      </div>

      <SyncHistoryTable history={MOCK_HISTORY} integrations={integrations} />

      {connectTarget && <ConnectDialog integration={connectTarget} isOpen={!!connectTarget} onClose={() => setConnectTarget(null)} onConnect={handleConnect} />}
      {disconnectTarget && <DisconnectDialog integration={disconnectTarget} isOpen={!!disconnectTarget} onClose={() => setDisconnectTarget(null)} onDisconnect={handleDisconnect} />}
    </div>
  );
};