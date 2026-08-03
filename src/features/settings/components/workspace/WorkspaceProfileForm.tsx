import { Upload } from 'lucide-react';
import { WorkspaceSettings } from '../../types/workspace.types';

interface Props {
  data: WorkspaceSettings;
  updateField: <K extends keyof WorkspaceSettings>(field: K, value: WorkspaceSettings[K]) => void;
}

export const WorkspaceProfileForm = ({ data, updateField }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Profile</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your workspace name, description, and logo.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Workspace Logo
          </label>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground overflow-hidden">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>
            <button
              type="button"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
            >
              Change
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="ws-name" className="block text-sm font-medium text-foreground">
            Workspace Name
          </label>
          <input
            id="ws-name"
            type="text"
            value={data.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="ws-desc" className="block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="ws-desc"
            rows={3}
            value={data.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
};