import { SocialPlatformConfig, SocialPlatformId } from '../../types/social.types';

interface Props {
  config: SocialPlatformConfig;
  onUpdate: (id: SocialPlatformId, updates: Partial<SocialPlatformConfig>) => void;
}

const Toggle = ({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description: string }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

export const SocialPublishingSettings = ({ config, onUpdate }: Props) => {
  return (
    <div className="border-t border-border bg-muted/10 p-5">
      <h4 className="mb-4 text-sm font-semibold text-foreground">Publishing & Sync Preferences</h4>
      <div className="divide-y divide-border">
        <Toggle 
          enabled={config.autoPublish} 
          onToggle={() => onUpdate(config.id, { autoPublish: !config.autoPublish })} 
          label="Auto Publish" 
          description="Automatically publish scheduled posts to this channel." 
        />
        <Toggle 
          enabled={config.autoSchedule} 
          onToggle={() => onUpdate(config.id, { autoSchedule: !config.autoSchedule })} 
          label="Auto Schedule" 
          description="Allow AuraPost to automatically find the best time to post." 
        />
        <Toggle 
          enabled={config.autoSync} 
          onToggle={() => onUpdate(config.id, { autoSync: !config.autoSync })} 
          label="Auto Sync" 
          description="Sync comments and messages back to AuraPost inbox." 
        />
        <Toggle 
          enabled={config.enableAnalytics} 
          onToggle={() => onUpdate(config.id, { enableAnalytics: !config.enableAnalytics })} 
          label="Enable Analytics" 
          description="Pull performance metrics and engagement data." 
        />
      </div>
    </div>
  );
};