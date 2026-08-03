import { StorageBucket } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  buckets: StorageBucket[];
  onToggle: (id: string, field: keyof StorageBucket) => void;
  onDelete: (id: string) => void;
}

export const StorageBucketsCard = ({ buckets, onToggle, onDelete }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-foreground">Buckets</h3>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Create Bucket
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Name</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Default</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Public</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Versioning</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Encryption</th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {buckets.map((b) => (
              <tr key={b.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{b.name}</td>
                <td className="px-4 py-3 text-center">
                  <input type="radio" checked={b.isDefault} readOnly className="h-4 w-4 text-primary focus:ring-ring" />
                </td>
                {['isPublic', 'versioning', 'encryption'].map((field) => (
                  <td key={field} className="px-4 py-3 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={b[field as keyof StorageBucket] as boolean}
                      onClick={() => onToggle(b.id, field as keyof StorageBucket)}
                      className={cn(
                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        b[field as keyof StorageBucket] ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', b[field as keyof StorageBucket] ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onDelete(b.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};