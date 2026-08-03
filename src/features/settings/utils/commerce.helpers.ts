import { CommercePlatformId, CommercePlatformConfig, CommerceHealthStatus } from '../types/commerce.types';
import { ShoppingBag, Globe, Package, Store, LucideIcon } from 'lucide-react';

export interface CommercePlatformMeta {
  name: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const COMMERCE_PLATFORMS_META: Record<CommercePlatformId, CommercePlatformMeta> = {
  shopify: { 
    name: 'Shopify', 
    description: 'Connect your Shopify store to sync products and orders.', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', 
    icon: Store 
  },
  woocommerce: { 
    name: 'WooCommerce', 
    description: 'Sync with your WordPress WooCommerce store.', 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', 
    icon: ShoppingBag 
  },
  amazon: { 
    name: 'Amazon', 
    description: 'Connect Amazon Seller Central for multi-channel sync.', 
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', 
    icon: Package 
  },
  ebay: { 
    name: 'eBay', 
    description: 'Sync listings and orders with your eBay account.', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
    icon: Globe 
  },
  aliexpress: { 
    name: 'AliExpress', 
    description: 'Import products and fulfill orders via AliExpress.', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
    icon: ShoppingBag 
  },
  alibaba: { 
    name: 'Alibaba', 
    description: 'Connect with Alibaba suppliers for bulk sourcing.', 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', 
    icon: Package 
  },
};

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'SAR', 'AED'];
export const LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'zh', 'ja'];
export const WAREHOUSES = ['Main Warehouse', 'US East', 'US West', 'EU Central', 'Asia Pacific'];

export const getDefaultCommerceConfigs = (): Record<CommercePlatformId, CommercePlatformConfig> => {
  const configs = {} as Record<CommercePlatformId, CommercePlatformConfig>;
  (Object.keys(COMMERCE_PLATFORMS_META) as CommercePlatformId[]).forEach((id) => {
    configs[id] = {
      id,
      accountIdentifier: '',
      status: 'disconnected',
      lastSyncDate: null,
      autoSync: false,
      importProducts: false,
      exportProducts: false,
      syncInventory: false,
      syncOrders: false,
      defaultCurrency: 'USD',
      defaultLanguage: 'en',
      defaultWarehouse: 'Main Warehouse',
      health: 'unknown',
      errorMessage: null,
    };
  });
  return configs;
};

export const getHealthColor = (health: CommerceHealthStatus): string => {
  switch (health) {
    case 'healthy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'degraded': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'down': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};