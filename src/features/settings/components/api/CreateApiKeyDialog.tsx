import { useState } from 'react';
import { X, Key, Copy, Check } from 'lucide-react';
import { ApiPermission } from '../../types/api.types';
import { API_PERMISSIONS } from '../../utils/api.helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, permissions: ApiPermission[]) => Promise<string>;
}

export const CreateApiKeyDialog = ({ isOpen, onClose, onCreate }: Props) => {
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<ApiPermission[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const togglePermission = (p: ApiPermission) => {
    setSelectedPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    const key = await onCreate(name, selectedPermissions);
    setGeneratedKey(key);
    setIsCreating(false);
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedPermissions([]);
    setGeneratedKey(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {generatedKey ? 'API Key Created' : 'Create API Key'}
          </h3>
          <button onClick={handleClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!generatedKey ? (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Backend"
                className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Permissions</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {API_PERMISSIONS.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 rounded border border-border p-2 hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(p.value)}
                      onChange={() => togglePermission(p.value)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-xs text-foreground">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button onClick={handleClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name || selectedPermissions.length === 0 || isCreating}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <Key className="h-4 w-4" />
                {isCreating ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Copy your new API key now. You won't be able to see it again!
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 font-mono text-xs break-all">
              <span className="flex-1">{generatedKey}</span>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <button onClick={handleClose} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};