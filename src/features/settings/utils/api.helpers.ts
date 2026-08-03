import { ApiPermission, WebhookEvent } from '../types/api.types';

export const API_PERMISSIONS: { value: ApiPermission; label: string; description: string }[] = [
  { value: 'read_products', label: 'Read Products', description: 'View product catalog' },
  { value: 'write_products', label: 'Write Products', description: 'Create and update products' },
  { value: 'read_orders', label: 'Read Orders', description: 'View order history' },
  { value: 'write_orders', label: 'Write Orders', description: 'Fulfill and update orders' },
  { value: 'read_customers', label: 'Read Customers', description: 'View customer data' },
  { value: 'read_analytics', label: 'Read Analytics', description: 'View performance metrics' },
  { value: 'write_analytics', label: 'Write Analytics', description: 'Push custom events' },
  { value: 'ai_generation', label: 'AI Generation', description: 'Access AI models' },
  { value: 'assets', label: 'Assets', description: 'Manage media library' },
  { value: 'publishing', label: 'Publishing', description: 'Post to social channels' },
];

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'product.created', label: 'Product Created' },
  { value: 'product.updated', label: 'Product Updated' },
  { value: 'product.deleted', label: 'Product Deleted' },
  { value: 'order.created', label: 'Order Created' },
  { value: 'order.updated', label: 'Order Updated' },
  { value: 'asset.created', label: 'Asset Created' },
  { value: 'asset.updated', label: 'Asset Updated' },
  { value: 'ai.completed', label: 'AI Completed' },
  { value: 'billing.updated', label: 'Billing Updated' },
  { value: 'workspace.updated', label: 'Workspace Updated' },
  { value: 'user.created', label: 'User Created' },
  { value: 'user.deleted', label: 'User Deleted' },
];

export const formatDate = (date: string | null): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};