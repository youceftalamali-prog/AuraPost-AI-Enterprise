import { useState } from 'react';
import { X } from 'lucide-react';
import { CommercePlatformId } from '../../types/commerce.types';
import { COMMERCE_PLATFORMS_META } from '../../utils/commerce.helpers';

interface Props {
  platformId: CommercePlatformId;
  onClose: () => void;
  onConnect: (id: CommercePlatformId, credentials: { url: string; token: string }) => Promise<void>;
}

export const CommerceConnectionDialog = ({ platformId, onClose, onConnect }: Props) => {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const meta = COMMERCE_PLATFORMS_META[platformId];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    await onConnect(platformId, { url, token });
    setIsConnecting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Connect {meta.name}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Store URL</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-store.myshopify.com"
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">API Token / Key</label>
            <input
              type="password"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your API credentials"
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url || !token || isConnecting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};