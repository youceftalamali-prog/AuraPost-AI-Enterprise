import { SettingsSearch } from './SettingsSearch';
import { SettingsNavGroup } from './SettingsNavGroup';
import { SettingsSearchResults } from './SettingsSearchResults';
import { useNavigation } from '../hooks/useNavigation';
import { useSettings } from '../hooks/useSettings';

export const SettingsSidebar = () => {
  const { searchQuery } = useSettings();
  const { clientNavigation, developerNavigation, activeModule, handleNavigationClick } = useNavigation();

  return (
    <aside className="hidden w-[260px] flex-col border-r border-border bg-muted/20 md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">Settings</h1>
      </div>
      <div className="border-b border-border p-4">
        <SettingsSearch />
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        {searchQuery ? (
          <SettingsSearchResults />
        ) : (
          <>
            <SettingsNavGroup
              title="Client Settings"
              items={clientNavigation}
              activeModule={activeModule}
              onItemClick={handleNavigationClick}
            />
            {developerNavigation.length > 0 && (
              <SettingsNavGroup
                title="Developer Settings"
                items={developerNavigation}
                activeModule={activeModule}
                onItemClick={handleNavigationClick}
              />
            )}
          </>
        )}
      </nav>
    </aside>
  );
};