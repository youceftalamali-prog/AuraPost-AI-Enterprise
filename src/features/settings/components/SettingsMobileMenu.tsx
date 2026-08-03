import { X } from 'lucide-react';
import { SettingsSearch } from './SettingsSearch';
import { SettingsNavGroup } from './SettingsNavGroup';
import { useNavigation } from '../hooks/useNavigation';
import { useResponsive } from '../hooks/useResponsive';
import { cn } from '../utils/settings.helpers';

export const SettingsMobileMenu = () => {
  const { isMobileMenuOpen, closeMobileMenu } = useResponsive();
  const { clientNavigation, developerNavigation, activeModule, handleNavigationClick } =
    useNavigation();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeMobileMenu}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] transform bg-background transition-transform duration-300 md:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-border p-4">
            <SettingsSearch />
          </div>

          <div className="flex-1 p-4">
            <SettingsNavGroup
              title="Client Area"
              items={clientNavigation}
              activeModule={activeModule}
              onItemClick={(item) => {
                handleNavigationClick(item);
                closeMobileMenu();
              }}
            />

            {developerNavigation.length > 0 && (
              <SettingsNavGroup
                title="Developer Area"
                items={developerNavigation}
                activeModule={activeModule}
                onItemClick={(item) => {
                  handleNavigationClick(item);
                  closeMobileMenu();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};