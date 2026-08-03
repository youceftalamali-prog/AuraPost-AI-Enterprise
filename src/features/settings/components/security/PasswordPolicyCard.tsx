import { PasswordPolicy } from '../../types/security.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  policy: PasswordPolicy;
  onChange: (updates: Partial<PasswordPolicy>) => void;
}

export const PasswordPolicyCard = ({ policy, onChange }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Password Policy</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">Minimum Length</label>
            <input type="number" value={policy.minLength} onChange={(e) => onChange({ minLength: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Password Expiration (Days)</label>
            <input type="number" value={policy.expirationDays} onChange={(e) => onChange({ expirationDays: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Password History</label>
            <input type="number" value={policy.historyCount} onChange={(e) => onChange({ historyCount: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Failed Attempts Limit</label>
            <input type="number" value={policy.failedAttemptsLimit} onChange={(e) => onChange({ failedAttemptsLimit: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-3">
          {[
            { key: 'requireNumbers', label: 'Require Numbers' },
            { key: 'requireSymbols', label: 'Require Symbols' },
            { key: 'requireUppercase', label: 'Require Uppercase' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{item.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={policy[item.key as keyof PasswordPolicy] as boolean}
                onClick={() => onChange({ [item.key]: !(policy[item.key as keyof PasswordPolicy] as boolean) })}
                className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', policy[item.key as keyof PasswordPolicy] ? 'bg-primary' : 'bg-muted')}
              >
                <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', policy[item.key as keyof PasswordPolicy] ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};