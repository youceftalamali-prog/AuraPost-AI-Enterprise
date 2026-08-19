import type { AgentLocale } from './types';
import type { AgentChatRole } from './agentChatApi';

// Pure, React-free presentation helpers for the agent chat UI, extracted so
// they can be unit tested without a DOM.

export interface AgentChatCopy {
  title: string;
  subtitle: string;
  placeholder: string;
  empty: string;
  sending: string;
  toolUsed: string;
}

export const AGENT_CHAT_COPY: Record<AgentLocale, AgentChatCopy> = {
  ar: {
    title: 'وكيل Aura',
    subtitle: 'حوّل منتجك إلى حملة كاملة عبر المحادثة',
    placeholder: 'اكتب رسالتك أو ألصق رابط المنتج…',
    empty: 'ابدأ بإرسال رابط المنتج أو وصف الحملة، وسيتولّى الوكيل الباقي.',
    sending: 'الوكيل يعمل…',
    toolUsed: 'استُخدمت الأداة',
  },
  fr: {
    title: 'Agent Aura',
    subtitle: 'Transformez votre produit en campagne complète par le chat',
    placeholder: 'Écrivez votre message ou collez le lien du produit…',
    empty: 'Commencez par envoyer un lien produit ou une description ; l’agent s’occupe du reste.',
    sending: 'L’agent travaille…',
    toolUsed: 'Outil utilisé',
  },
  en: {
    title: 'Aura Agent',
    subtitle: 'Turn your product into a full campaign through chat',
    placeholder: 'Type your message or paste the product link…',
    empty: 'Start by sending a product link or a description — the agent handles the rest.',
    sending: 'The agent is working…',
    toolUsed: 'Used tool',
  },
};

const TOOL_LABELS: Record<AgentLocale, Record<string, string>> = {
  ar: {
    import_product: 'استيراد المنتج',
    analyze_market: 'تحليل السوق',
    generate_campaign: 'توليد الحملة',
    design_creative: 'الاتجاه الإبداعي',
    generate_media: 'توليد الصور',
    render_video: 'إنشاء الفيديو',
    export_campaign: 'تصدير الحملة',
  },
  fr: {
    import_product: 'Importer le produit',
    analyze_market: 'Analyse du marché',
    generate_campaign: 'Générer la campagne',
    design_creative: 'Direction créative',
    generate_media: 'Générer les médias',
    render_video: 'Rendu vidéo',
    export_campaign: 'Exporter la campagne',
  },
  en: {
    import_product: 'Import product',
    analyze_market: 'Market analysis',
    generate_campaign: 'Generate campaign',
    design_creative: 'Creative direction',
    generate_media: 'Generate media',
    render_video: 'Render video',
    export_campaign: 'Export campaign',
  },
};

export function isRtlLocale(locale: AgentLocale): boolean {
  return locale === 'ar';
}

/** Which horizontal side a message bubble sits on. */
export function bubbleAlignment(role: AgentChatRole): 'start' | 'end' {
  return role === 'user' ? 'end' : 'start';
}

/** Localized, human-friendly label for a tool name; falls back to the raw name. */
export function toolLabel(toolName: string, locale: AgentLocale): string {
  return TOOL_LABELS[locale]?.[toolName] ?? toolName;
}

/** Whether a draft message is sendable (non-empty after trimming). */
export function canSend(draft: string): boolean {
  return draft.trim().length > 0;
}
