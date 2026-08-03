import { useState } from 'react';
import { X } from 'lucide-react';
import { StorageProvider } from '../../types/storage.types';

interface Props {
  provider: StorageProvider | null;
  onClose: () => void;
  onSave: (id: string, data: any) => void;
}

export const StorageProviderDialog = ({ provider, onClose, onSave }: Props) => {
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [region, setRegion] = useState(provider?.region || '');

  if (!provider) return null;

  const handleSave = () => {
    onSave(provider.id, { apiKey, secret, region });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Configure {provider.name}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">API Key / Access ID</label>
            <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Secret Key</label>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Region</label>
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
          <button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Configuration</button>
        </div>
      </div>
    </div>
  );
};