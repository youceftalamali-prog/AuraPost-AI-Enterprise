import { 
  SocialPlatformId, 
  SocialPlatformConfig, 
  SocialHealthStatus, 
  WebhookStatus 
} from '../types/social.types';
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Twitter, 
  Video, 
  Image as ImageIcon, 
  LucideIcon 
} from 'lucide-react';

export interface SocialPlatformMeta {
  name: string;
  color: string;
  icon: LucideIcon;
}

export const SOCIAL_PLATFORMS_META: Record<SocialPlatformId, SocialPlatformMeta> = {
  facebook: { 
    name: 'Facebook', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
    icon: Facebook 
  },
  instagram: { 
    name: 'Instagram', 
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', 
    icon: Instagram 
  },
  tiktok: { 
    name: 'TikTok', 
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', 
    icon: Video 
  },
  linkedin: { 
    name: 'LinkedIn', 
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', 
    icon: Linkedin 
  },
  pinterest: { 
    name: 'Pinterest', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
    icon: ImageIcon 
  },
  x: { 
    name: 'X (Twitter)', 
    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400', 
    icon: Twitter 
  },
  youtube: { 
    name: 'YouTube', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
    icon: Youtube 
  },
};

export const getDefaultSocialConfigs = (): Record<SocialPlatformId, SocialPlatformConfig> => {
  const configs = {} as Record<SocialPlatformId, SocialPlatformConfig>;
  (Object.keys(SOCIAL_PLATFORMS_META) as SocialPlatformId[]).forEach((id) => {
    configs[id] = {
      id,
      accountName: '',
      accountId: '',
      status: 'disconnected',
      health: 'unknown',
      webhookStatus: 'inactive',
      lastSyncDate: null,
      autoPublish: false,
      autoSchedule: false,
      autoSync: false,
      enableAnalytics: false,
      errorMessage: null,
    };
  });
  return configs;
};

export const getHealthColor = (health: SocialHealthStatus): string => {
  switch (health) {
    case 'healthy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'degraded': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'down': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

export const getWebhookColor = (status: WebhookStatus): string => {
  switch (status) {
    case 'active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'failed': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};