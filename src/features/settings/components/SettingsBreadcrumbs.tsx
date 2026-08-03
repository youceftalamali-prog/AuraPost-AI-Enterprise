import { ChevronRight } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { getModuleLabel } from '../utils/settings.helpers';

export const SettingsBreadcrumbs = () => {
  const { activeModule } = useSettings();

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">Settings</span>

      {activeModule && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="font-medium text-foreground">
            {getModuleLabel(activeModule)}
          </span>
        </>
      )}
    </nav>
  );
};