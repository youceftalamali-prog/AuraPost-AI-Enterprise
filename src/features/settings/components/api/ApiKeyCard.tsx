import { Plus } from 'lucide-react';
import { ApiKey } from '../../types/api.types';
import { ApiKeyTable } from './ApiKeyTable';

interface Props {
  keys: ApiKey[];
  onCreate: () => void;
  onEdit: (key: ApiKey) => void;
  onDelete: (key: ApiKey) => void;
}

export const ApiKeyCard = ({ keys, onCreate, onEdit, onDelete }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">API Keys</h3>
          <p className="text-xs text-muted-foreground">Manage your secret keys for server-side integration.</p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create Key
        </button>
      </div>
      <ApiKeyTable keys={keys} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};