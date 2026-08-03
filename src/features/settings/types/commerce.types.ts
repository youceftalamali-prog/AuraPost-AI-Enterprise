export type CommercePlatformId =
  | 'shopify'
  | 'woocommerce'
  | 'amazon'
  | 'ebay'
  | 'aliexpress'
  | 'alibaba';

export type CommerceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'syncing';

export type CommerceHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface CommercePlatformConfig {
  id: CommercePlatformId;
  accountIdentifier: string;
  status: CommerceConnectionStatus;
  lastSyncDate: string | null;
  autoSync: boolean;
  importProducts: boolean;
  exportProducts: boolean;
  syncInventory: boolean;
  syncOrders: boolean;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultWarehouse: string;
  health: CommerceHealthStatus;
  errorMessage: string | null;
}