import { Megaphone } from 'lucide-react';
import { MarketingSettings } from '../../types/notifications.types';
import { cn } from '../../utils/settings.helpers';

interface Props {
  settings: MarketingSettings;
  onChange: (updates: Partial<MarketingSettings>) => void;
}

export const MarketingNotificationsCard = ({ settings, onChange }: Props) => {
  const items = [
    { key: 'announcements', label: 'Product Announcements' },
    { key: 'promotions', label: 'Promotions & Discounts' },
    { key: 'featureReleases', label: 'New Feature Releases' },
    { key: 'newsletter', label: 'Monthly Newsletter' },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Marketing</h3>
          <p className="text-xs text-muted-foreground">News and offers from AuraPost.</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key as keyof MarketingSettings]}
              onClick={() => onChange({ [item.key]: !settings[item.key as keyof MarketingSettings] })}
              className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', settings[item.key as keyof MarketingSettings] ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out', settings[item.key as keyof MarketingSettings] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};