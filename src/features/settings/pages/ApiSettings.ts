import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { ApiKey, Webhook, WebhookEvent, ApiPermission, WebhookLog, ApiUsageStats } from '../types/api.types';
import { ApiSkeleton } from '../components/api/ApiSkeleton';
import { ApiUsageCard } from '../components/api/ApiUsageCard';
import { ApiKeyCard } from '../components/api/ApiKeyCard';
import { CreateApiKeyDialog } from '../components/api/CreateApiKeyDialog';
import { EditApiKeyDialog } from '../components/api/EditApiKeyDialog';
import { DeleteApiKeyDialog } from '../components/api/DeleteApiKeyDialog';
import { WebhookCard } from '../components/api/WebhookCard';
import { WebhookLogsDialog } from '../components/api/WebhookLogsDialog';

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production Backend', keyPrefix: 'sk_live_1234567890abcdef', created: '2026-01-01T00:00:00Z', expires: null, lastUsed: '2026-01-26T12:00:00Z', status: 'active', permissions: ['read_products', 'write_orders'] },
  { id: '2', name: 'CI/CD Pipeline', keyPrefix: 'sk_test_abcdef1234567890', created: '2026-01-10T00:00:00Z', expires: '2026-02-10T00:00:00Z', lastUsed: '2026-01-25T08:00:00Z', status: 'active', permissions: ['ai_generation', 'assets'] },
];

const MOCK_WEBHOOKS: Webhook[] = [
  { id: '1', url: 'https://api.myapp.com/webhooks/aurapost', events: ['order.created', 'product.updated'], status: 'active', secret: 'whsec_...', created: '2026-01-15T00:00:00Z', successRate: 99.8 },
];

const MOCK_LOGS: WebhookLog[] = [
  { id: '1', timestamp: '2026-01-26T12:05:00Z', event: 'order.created', status: 'success', duration: 120, ip: '192.168.1.1', retryCount: 0, payloadSize: 2048, responseCode: 200 },
  { id: '2', timestamp: '2026-01-26T11:00:00Z', event: 'product.updated', status: 'failed', duration: 5000, ip: '192.168.1.1', retryCount: 3, payloadSize: 1024, responseCode: 500 },
];

const MOCK_STATS: ApiUsageStats = {
  requestsToday: 12450,
  requestsMonth: 340200,
  rateLimit: 1000,
  remaining: 850,
  avgLatency: 145,
  errorRate: 0.02,
};

export const ApiSettings = () => {
  const { setDirty } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null);

  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);
  const [logsWebhook, setLogsWebhook] = useState<Webhook | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateKey = async (name: string, permissions: ApiPermission[]) => {
    try { await settingsApi.patch(SettingsModule.API, 'current', { action: 'create_key', name, permissions }); } catch (e) {}
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      keyPrefix: 'sk_live_' + Math.random().toString(36).substring(2, 10),
      created: new Date().toISOString(),
      expires: null,
      lastUsed: null,
      status: 'active',
      permissions,
    };
    setKeys(prev => [...prev, newKey]);
    return 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleSaveKey = async (id: string, name: string, permissions: ApiPermission[]) => {
    try { await settingsApi.patch(SettingsModule.API, 'current', { action: 'update_key', id, name, permissions }); } catch (e) {}
    setKeys(prev => prev.map(k => (k.id === id ? { ...k, name, permissions } : k)));
    setEditKey(null);
  };

  const handleDeleteKey = async (id: string) => {
    try { await settingsApi.delete(SettingsModule.API, 'current'); } catch (e) {}
    setKeys(prev => prev.filter(k => k.id !== id));
    setDeleteKey(null);
  };

  const handleCreateWebhook = async () => {
    // Note: no dedicated create/edit webhook dialog ships with this module
    // (only WebhookLogsDialog exists for webhooks). This opens the create
    // flag for parity with the API-key flow; wire a dialog here if/when
    // one is added to components/api.
    setShowCreateWebhook(true);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditWebhook(webhook);
  };

  const handleDeleteWebhook = async (webhook: Webhook) => {
    try { await settingsApi.patch(SettingsModule.API, 'current', { action: 'delete_webhook', id: webhook.id }); } catch (e) {}
    setWebhooks(prev => prev.filter(w => w.id !== webhook.id));
  };

  const handleWebhookLogs = (webhook: Webhook) => {
    setLogsWebhook(webhook);
  };

  useEffect(() => {
    setDirty(false);
  }, [setDirty]);

  if (isLoading) {
    return React.createElement(ApiSkeleton);
  }

  const filteredLogs = logsWebhook
    ? MOCK_LOGS.filter((log) => log.event === logsWebhook.events[0] || true)
    : [];

  return React.createElement(
    'div',
    { className: 'space-y-8' },
    React.createElement(
      'div',
      null,
      React.createElement('h2', { className: 'text-2xl font-semibold tracking-tight text-foreground' }, 'API & Webhooks'),
      React.createElement(
        'p',
        { className: 'mt-1 text-sm text-muted-foreground' },
        'Manage API keys, webhook endpoints, and monitor request usage.'
      )
    ),
    React.createElement(ApiUsageCard, { stats: MOCK_STATS }),
    React.createElement(ApiKeyCard, {
      keys,
      onCreate: () => setShowCreateKey(true),
      onEdit: (key: ApiKey) => setEditKey(key),
      onDelete: (key: ApiKey) => setDeleteKey(key),
    }),
    React.createElement(WebhookCard, {
      webhooks,
      onCreate: handleCreateWebhook,
      onEdit: handleEditWebhook,
      onDelete: handleDeleteWebhook,
      onLogs: handleWebhookLogs,
    }),
    React.createElement(CreateApiKeyDialog, {
      isOpen: showCreateKey,
      onClose: () => setShowCreateKey(false),
      onCreate: handleCreateKey,
    }),
    React.createElement(EditApiKeyDialog, {
      keyToEdit: editKey,
      onClose: () => setEditKey(null),
      onSave: handleSaveKey,
    }),
    React.createElement(DeleteApiKeyDialog, {
      keyToDelete: deleteKey,
      onClose: () => setDeleteKey(null),
      onDelete: handleDeleteKey,
    }),
    React.createElement(WebhookLogsDialog, {
      webhook: logsWebhook,
      logs: filteredLogs,
      onClose: () => setLogsWebhook(null),
    })
  );
};
