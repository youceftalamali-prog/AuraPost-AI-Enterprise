export type ApiPermission =
  | 'read_products'
  | 'write_products'
  | 'read_orders'
  | 'write_orders'
  | 'read_customers'
  | 'read_analytics'
  | 'write_analytics'
  | 'ai_generation'
  | 'assets'
  | 'publishing';

export type WebhookEvent =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'order.created'
  | 'order.updated'
  | 'asset.created'
  | 'asset.updated'
  | 'ai.completed'
  | 'billing.updated'
  | 'workspace.updated'
  | 'user.created'
  | 'user.deleted';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  expires: string | null;
  lastUsed: string | null;
  status: 'active' | 'disabled';
  permissions: ApiPermission[];
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: 'active' | 'paused' | 'failing';
  secret: string;
  created: string;
  successRate: number;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  event: WebhookEvent;
  status: 'success' | 'failed' | 'pending';
  duration: number;
  ip: string;
  retryCount: number;
  payloadSize: number;
  responseCode: number;
}

export interface ApiUsageStats {
  requestsToday: number;
  requestsMonth: number;
  rateLimit: number;
  remaining: number;
  avgLatency: number;
  errorRate: number;
}