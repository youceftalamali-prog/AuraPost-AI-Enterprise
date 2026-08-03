import { Menu } from 'lucide-react';
import { SettingsBreadcrumbs } from './SettingsBreadcrumbs';
import { useResponsive } from '../hooks/useResponsive';

export const SettingsHeader = () => {
  const { isMobile, toggleMobileMenu } = useResponsive();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border px-4 sm:px-6 lg:px-8">
      {isMobile && (
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <SettingsBreadcrumbs />
    </header>
  );
};