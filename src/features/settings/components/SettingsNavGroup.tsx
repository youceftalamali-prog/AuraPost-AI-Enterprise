import { SettingsNavItem } from '../types/settings.types';
import { SettingsNavItemComponent } from './SettingsNavItem';

interface SettingsNavGroupProps {
  title: string;
  items: SettingsNavItem[];
  activeModule: string | null;
  onItemClick: (item: SettingsNavItem) => void;
}

export const SettingsNavGroup = ({
  title,
  items,
  activeModule,
  onItemClick,
}: SettingsNavGroupProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => (
          <SettingsNavItemComponent
            key={item.id}
            item={item}
            isActive={activeModule === item.id}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
};