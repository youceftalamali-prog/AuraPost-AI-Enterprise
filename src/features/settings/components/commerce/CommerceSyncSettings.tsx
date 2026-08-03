import { CommercePlatformConfig, CommercePlatformId } from '../../types/commerce.types';
import { CURRENCIES, LANGUAGES, WAREHOUSES } from '../../utils/commerce.helpers';

interface Props {
  config: CommercePlatformConfig;
  onUpdate: (id: CommercePlatformId, updates: Partial<CommercePlatformConfig>) => void;
}

const Toggle = ({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description: string }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

export const CommerceSyncSettings = ({ config, onUpdate }: Props) => {
  return (
    <div className="border-t border-border bg-muted/10 p-5 space-y-6">
      <div className="divide-y divide-border">
        <Toggle enabled={config.autoSync} onToggle={() => onUpdate(config.id, { autoSync: !config.autoSync })} label="Auto Sync" description="Automatically sync data every 24 hours." />
        <Toggle enabled={config.importProducts} onToggle={() => onUpdate(config.id, { importProducts: !config.importProducts })} label="Import Products" description="Pull products from this platform into AuraPost." />
        <Toggle enabled={config.exportProducts} onToggle={() => onUpdate(config.id, { exportProducts: !config.exportProducts })} label="Export Products" description="Push AuraPost products to this platform." />
        <Toggle enabled={config.syncInventory} onToggle={() => onUpdate(config.id, { syncInventory: !config.syncInventory })} label="Sync Inventory" description="Keep stock levels updated in real-time." />
        <Toggle enabled={config.syncOrders} onToggle={() => onUpdate(config.id, { syncOrders: !config.syncOrders })} label="Sync Orders" description="Import orders for centralized fulfillment." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4 border-t border-border">
        <div>
          <label className="block text-sm font-medium text-foreground">Default Currency</label>
          <select
            value={config.defaultCurrency}
            onChange={(e) => onUpdate(config.id, { defaultCurrency: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Default Language</label>
          <select
            value={config.defaultLanguage}
            onChange={(e) => onUpdate(config.id, { defaultLanguage: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Default Warehouse</label>
          <select
            value={config.defaultWarehouse}
            onChange={(e) => onUpdate(config.id, { defaultWarehouse: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};