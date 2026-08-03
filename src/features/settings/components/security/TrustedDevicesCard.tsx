import { TrustedDevice } from '../../types/security.types';
import { formatDate } from '../../utils/security.helpers';
import { Smartphone, Trash2, Edit2 } from 'lucide-react';

interface Props {
  devices: TrustedDevice[];
  onRemove: (id: string) => void;
  onRename: (id: string) => void;
}

export const TrustedDevicesCard = ({ devices, onRemove, onRename }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">Trusted Devices</h3>
      <div className="space-y-4">
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.browser} • Last seen {formatDate(d.lastSeen)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onRename(d.id)} className="text-muted-foreground hover:text-foreground">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => onRemove(d.id)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};