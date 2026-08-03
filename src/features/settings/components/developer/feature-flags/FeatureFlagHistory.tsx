import { FlagHistoryEntry } from '../../../types/featureFlags.types';
import { History, User, Clock } from 'lucide-react';

interface Props {
  history: FlagHistoryEntry[];
}

export const FeatureFlagHistory = ({ history }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Change History</h3>
          <p className="text-xs text-muted-foreground">Audit trail of flag modifications.</p>
        </div>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {history.map((entry) => (
          <div key={entry.id} className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="w-0.5 flex-1 bg-border mt-2"></div>
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{entry.user} <span className="text-muted-foreground font-normal">{entry.action}</span></p>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs font-mono">
                <div className="flex gap-2">
                  <span className="text-red-500">-</span>
                  <span className="text-muted-foreground">{entry.oldValue}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-500">+</span>
                  <span className="text-foreground">{entry.newValue}</span>
                </div>
              </div>
              {entry.reason && <p className="mt-2 text-xs text-muted-foreground italic">"{entry.reason}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};