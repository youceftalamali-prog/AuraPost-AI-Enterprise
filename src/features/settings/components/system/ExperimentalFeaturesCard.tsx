import { FlaskConical } from 'lucide-react';
import { ExperimentalFeature } from '../../types/system.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  features: ExperimentalFeature[];
  onToggle: (id: string) => void;
}

export const ExperimentalFeaturesCard = ({ features, onToggle }: Props) => {
  const badgeColors = {
    beta: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    labs: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    preview: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    internal: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Experimental Features</h3>
          <p className="text-xs text-muted-foreground">Enable beta and preview features.</p>
        </div>
      </div>
      <div className="space-y-4">
        {features.map((f) => (
          <div key={f.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{f.name}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium uppercase', badgeColors[f.badge])}>
                  {f.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={f.enabled}
              onClick={() => onToggle(f.id)}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', f.enabled ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', f.enabled ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};