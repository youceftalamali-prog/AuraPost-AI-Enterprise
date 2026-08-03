import { useState } from 'react';
import { IpRule } from '../../types/security.types';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface Props {
  rules: IpRule[];
  onAdd: (ip: string, desc: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

export const IpWhitelistCard = ({ rules, onAdd, onRemove, onToggle }: Props) => {
  const [newIp, setNewIp] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAdd = () => {
    if (newIp) {
      onAdd(newIp, newDesc);
      setNewIp('');
      setNewDesc('');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">IP Whitelist</h3>
      
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="IP Address or CIDR (e.g., 192.168.1.0/24)"
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Description"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button onClick={handleAdd} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(rule.id)}
                className={cn(
                  'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  rule.enabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', rule.enabled ? 'translate-x-4' : 'translate-x-0')} />
              </button>
              <div>
                <p className="text-sm font-mono text-foreground">{rule.ip}</p>
                <p className="text-xs text-muted-foreground">{rule.description}</p>
              </div>
            </div>
            <button onClick={() => onRemove(rule.id)} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};