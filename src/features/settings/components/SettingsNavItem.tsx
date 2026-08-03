import { LucideIcon } from 'lucide-react';
import { SettingsNavItem } from '../types/settings.types';
import { cn } from '../utils/settings.helpers';

interface SettingsNavItemProps {
  item: SettingsNavItem;
  isActive: boolean;
  onClick: () => void;
}

export const SettingsNavItemComponent = ({
  item,
  isActive,
  onClick,
}: SettingsNavItemProps) => {
  const Icon = item.icon as LucideIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {item.badge}
        </span>
      )}
    </button>
  );
};