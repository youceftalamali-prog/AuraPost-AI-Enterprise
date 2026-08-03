import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FeatureFlag, FlagEnvironment, FlagCategory } from '../../../types/featureFlags.types';

interface Props {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'clone';
  flag: FeatureFlag | null;
  onClose: () => void;
  onSave: (data: Partial<FeatureFlag>) => void;
}

export const FeatureFlagDialog = ({ isOpen, mode, flag, onClose, onSave }: Props) => {
  const [formData, setFormData] = useState<Partial<FeatureFlag>>({});

  useEffect(() => {
    if (flag) {
      setFormData(mode === 'clone' ? { ...flag, name: `${flag.name} (Copy)`, key: `${flag.key}_copy`, id: undefined } : flag);
    } else {
      setFormData({ status: 'disabled', rolloutPercentage: 100, environment: 'development', category: 'experimental' });
    }
  }, [flag, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground capitalize">{mode} Feature Flag</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name</label>
              <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Key</label>
              <input required type="text" value={formData.key || ''} onChange={(e) => setFormData({ ...formData, key: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Environment</label>
              <select value={formData.environment || 'development'} onChange={(e) => setFormData({ ...formData, environment: e.target.value as FlagEnvironment })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="testing">Testing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <select value={formData.category || 'experimental'} onChange={(e) => setFormData({ ...formData, category: e.target.value as FlagCategory })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="experimental">Experimental</option>
                <option value="beta">Beta</option>
                <option value="internal">Internal</option>
                <option value="release">Release</option>
                <option value="security">Security</option>
                <option value="ai">AI</option>
                <option value="storage">Storage</option>
                <option value="billing">Billing</option>
                <option value="workspace">Workspace</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rollout %</label>
              <input type="number" min="0" max="100" value={formData.rolloutPercentage || 0} onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Expiration Date</label>
              <input type="date" value={formData.expirationDate || ''} onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Flag</button>
          </div>
        </form>
      </div>
    </div>
  );
};