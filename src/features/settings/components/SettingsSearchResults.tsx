import { useNavigation } from '../hooks/useNavigation';
import { SettingsNavItemComponent } from './SettingsNavItem';
import { Search } from 'lucide-react';

export const SettingsSearchResults = () => {
  const { filteredNavigation, activeModule, handleNavigationClick } =
    useNavigation();

  if (filteredNavigation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No settings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredNavigation.map((item) => (
        <SettingsNavItemComponent
          key={item.id}
          item={item}
          isActive={activeModule === item.id}
          onClick={() => handleNavigationClick(item)}
        />
      ))}
    </div>
  );
};