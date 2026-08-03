import { Search, X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { cn } from '../utils/settings.helpers';

export const SettingsSearch = () => {
  const { searchQuery, setSearchQuery } = useSettings();

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search settings…"
        className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />

      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded p-1',
            'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};