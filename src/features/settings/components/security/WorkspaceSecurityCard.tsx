import { WorkspaceSecurity } from '../../types/security.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: WorkspaceSecurity;
  onChange: (updates: Partial<WorkspaceSecurity>) => void;
}

export const WorkspaceSecurityCard = ({ settings, onChange }: Props) => {
  const toggles = [
    { key: 'forceMfa', label: 'Force MFA for all members', desc: 'Require 2FA for everyone in the workspace.' },
    { key: 'forceEmailVerification', label: 'Force Email Verification', desc: 'Members must verify email before accessing.' },
    { key: 'disablePublicInvites', label: 'Disable Public Invites', desc: 'Only admins can invite new members.' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Workspace Security</h3>
      
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
              aria-checked={settings[t.key as keyof WorkspaceSecurity] as boolean}
              onClick={() => onChange({ [t.key]: !(settings[t.key as keyof WorkspaceSecurity] as boolean) })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[t.key as keyof WorkspaceSecurity] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[t.key as keyof WorkspaceSecurity] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Session Timeout (min)</label>
            <input type="number" value={settings.sessionTimeout} onChange={(e) => onChange({ sessionTimeout: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Idle Timeout (min)</label>
            <input type="number" value={settings.idleTimeout} onChange={(e) => onChange({ idleTimeout: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Max Devices</label>
            <input type="number" value={settings.maxDevices} onChange={(e) => onChange({ maxDevices: parseInt(e.target.value) })} className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};