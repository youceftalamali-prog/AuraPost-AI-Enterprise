import { ShieldCheck, RefreshCw, Eye } from 'lucide-react';
import { SecurityOverview } from '../../types/security.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  mfaStatus: SecurityOverview['mfaStatus'];
  onEnable: () => void;
  onDisable: () => void;
  onRegenerate: () => void;
  onViewCodes: () => void;
}

export const TwoFactorCard = ({ mfaStatus, onEnable, onDisable, onRegenerate, onViewCodes }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Two-Factor Authentication</h3>
            <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
          </div>
        </div>
        <span className={cn(
          'rounded-full px-3 py-1 text-xs font-medium capitalize',
          mfaStatus === 'enabled' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
          mfaStatus === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
        )}>
          {mfaStatus}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {mfaStatus === 'disabled' ? (
          <button onClick={onEnable} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Enable 2FA
          </button>
        ) : (
          <>
            <button onClick={onDisable} className="rounded-md border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
              Disable 2FA
            </button>
            <button onClick={onRegenerate} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <RefreshCw className="h-4 w-4" /> Regenerate Codes
            </button>
            <button onClick={onViewCodes} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <Eye className="h-4 w-4" /> View Recovery Codes
            </button>
          </>
        )}
      </div>
    </div>
  );
};