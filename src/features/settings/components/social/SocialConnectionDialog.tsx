import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { SocialPlatformId } from '../../types/social.types';
import { SOCIAL_PLATFORMS_META } from '../../utils/social.helpers';

interface Props {
  platformId: SocialPlatformId;
  onClose: () => void;
  onConnect: (id: SocialPlatformId) => Promise<void>;
}

export const SocialConnectionDialog = ({ platformId, onClose, onConnect }: Props) => {
  const meta = SOCIAL_PLATFORMS_META[platformId];

  useEffect(() => {
    const timer = setTimeout(() => {
      onConnect(platformId);
    }, 2000);
    return () => clearTimeout(timer);
  }, [platformId, onConnect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg text-center">
        <div className="absolute right-4 top-4">
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Connecting to {meta.name}</h3>
          <p className="text-sm text-muted-foreground">
            Redirecting to {meta.name} OAuth portal. Please authorize AuraPost to access your account...
          </p>
        </div>
      </div>
    </div>
  );
};