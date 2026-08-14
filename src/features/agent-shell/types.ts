export type AgentLocale = 'ar' | 'fr' | 'en';

export type AgentSourceMode =
  | 'url'
  | 'image'
  | 'saved_product'
  | 'description'
  | 'template';

export type AgentToolId =
  | 'catalog'
  | 'import'
  | 'analyzer'
  | 'campaign_brief'
  | 'content_package'
  | 'creative_direction'
  | 'production_blueprint'
  | 'campaign_export'
  | 'video'
  | 'content_studio'
  | 'image_studio'
  | 'settings';

export interface AgentTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  accent: string;
}
