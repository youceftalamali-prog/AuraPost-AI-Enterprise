import { Monitor } from 'lucide-react';
import { Session } from '../../types/security.types';
import { formatDate } from '../../utils/security.helpers';
import { cn } from '../../utils/settings.helpers';

interface Props {
  session: Session;
  onTerminate: () => void;
}

export const ActiveSessionRow = ({ session, onTerminate }: Props) => {
  return (
    <tr className="transition-colors hover:bg-muted/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              {session.device}
              {session.isCurrent && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Current</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{session.browser} on {session.os}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{session.ip}</td>
      <td className="px-4 py-3 text-sm text-foreground">{session.country}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(session.lastActivity)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(session.created)}</td>
      <td className="px-4 py-3 text-right">
        {!session.isCurrent && (
          <button onClick={onTerminate} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
            Terminate
          </button>
        )}
      </td>
    </tr>
  );
};