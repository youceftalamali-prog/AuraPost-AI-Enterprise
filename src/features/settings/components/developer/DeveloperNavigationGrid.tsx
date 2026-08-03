import { ArrowRight } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../utils/developer.helpers';
import { cn } from '../../utils/settings.helpers';

export const DeveloperNavigationGrid = () => {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-foreground">Developer Tools</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAVIGATION_ITEMS.map((item) => (
          <div
            key={item.id}
            className={cn(
              'group relative flex flex-col rounded-lg border border-border bg-background p-5 transition-all hover:border-primary/50 hover:shadow-sm',
              'cursor-pointer'
            )}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">{item.label}</h4>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{item.description}</p>
            <div className="mt-4 flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Open module <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};