import { Search } from 'lucide-react';
import { FlagEnvironment, FlagCategory } from '../../../types/featureFlags.types';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  envFilter: FlagEnvironment | 'all';
  setEnvFilter: (v: FlagEnvironment | 'all') => void;
  catFilter: FlagCategory | 'all';
  setCatFilter: (v: FlagCategory | 'all') => void;
}

export const FeatureFlagFilters = ({ search, setSearch, envFilter, setEnvFilter, catFilter, setCatFilter }: Props) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search flags by name or key..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value as any)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All Environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
          <option value="testing">Testing</option>
        </select>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as any)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All Categories</option>
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
  );
};