import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ApiKey, ApiPermission } from '../../types/api.types';
import { API_PERMISSIONS } from '../../utils/api.helpers';

interface Props {
  keyToEdit: ApiKey | null;
  onClose: () => void;
  onSave: (id: string, name: string, permissions: ApiPermission[]) => void;
}

export const EditApiKeyDialog = ({ keyToEdit, onClose, onSave }: Props) => {
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<ApiPermission[]>([]);

  useEffect(() => {
    if (keyToEdit) {
      setName(keyToEdit.name);
      setSelectedPermissions(keyToEdit.permissions);
    }
  }, [keyToEdit]);

  if (!keyToEdit) return null;

  const togglePermission = (p: ApiPermission) => {
    setSelectedPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleSave = () => {
    onSave(keyToEdit.id, name, selectedPermissions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Edit API Key</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <button onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};