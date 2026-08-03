import { LifecyclePolicy } from '../../types/storage.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  policy: LifecyclePolicy;
  onChange: (updates: Partial<LifecyclePolicy>) => void;
}

export const StorageLifecycleCard = ({ policy, onChange }: Props) => {
  const toggles = [
    { key: 'autoArchive', label: 'Auto Archive', desc: 'Move old files to cold storage.' },
    { key: 'autoDelete', label: 'Auto Delete', desc: 'Permanently delete expired objects.' },
    { key: 'coldStorage', label: 'Cold Storage Enabled', desc: 'Use cheaper storage for infrequent access.' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Lifecycle Policies</h3>
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
              aria-checked={policy[t.key as keyof LifecyclePolicy] as boolean}
              onClick={() => onChange({ [t.key]: !policy[t.key as keyof LifecyclePolicy] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', policy[t.key as keyof LifecyclePolicy] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', policy[t.key as keyof LifecyclePolicy] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Object Expiration (Days)</label>
            <input type="number" value={policy.objectExpiration} onChange={(e) => onChange({ objectExpiration: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Version Cleanup (Days)</label>
            <input type="number" value={policy.versionCleanup} onChange={(e) => onChange({ versionCleanup: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};