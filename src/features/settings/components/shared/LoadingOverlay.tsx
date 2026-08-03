import { Loader2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

export const LoadingOverlay = () => {
  const { isSaving } = useSettings();

  if (!isSaving) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-6 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Saving changes...</p>
      </div>
    </div>
  );
};