import { Zap } from 'lucide-react';
import { WorkspaceBehavior } from '../../types/system.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: WorkspaceBehavior;
  onChange: (updates: Partial<WorkspaceBehavior>) => void;
}

export const WorkspaceBehaviorCard = ({ settings, onChange }: Props) => {
  const toggles = [
    { key: 'autoSave', label: 'Auto Save', desc: 'Automatically save changes as you work.' },
    { key: 'confirmBeforeDelete', label: 'Confirm Before Delete', desc: 'Show a confirmation dialog before deleting items.' },
    { key: 'autoRefresh', label: 'Auto Refresh', desc: 'Automatically refresh data when changes are detected.' },
    { key: 'autoSync', label: 'Auto Sync', desc: 'Keep data synchronized across devices.' },
    { key: 'backgroundProcessing', label: 'Background Processing', desc: 'Process heavy tasks in the background.' },
    { key: 'performanceMode', label: 'Performance Mode', desc: 'Reduce animations and effects for better performance.' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Workspace Behavior</h3>
          <p className="text-xs text-muted-foreground">Control how the application behaves.</p>
        </div>
      </div>
      <div className="space-y-4">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[t.key as keyof WorkspaceBehavior]}
              onClick={() => onChange({ [t.key]: !settings[t.key as keyof WorkspaceBehavior] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[t.key as keyof WorkspaceBehavior] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[t.key as keyof WorkspaceBehavior] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};