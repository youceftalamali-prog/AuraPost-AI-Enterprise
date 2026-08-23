// Injectable tool executor registry for the conversational Aura agent.
import { type AgentLocale } from './contracts';
import { AGENT_TOOL_NAMES, getToolDefinition, validateToolCall, type AgentToolCall } from './toolCallingModel';
import type { ToolExecutionContext, ToolExecutionResult, ToolExecutor } from './toolCallingLoop';
import { assertPublicProductUrl } from '../imports/productUrlPolicy';
import { scrapeShopifyProduct, validateShopifyUrl, type ExtractedProduct } from '../shopify-extractor';

export const AGENT_EXECUTOR_STATUS_PENDING = 'pending_backend';
export const AGENT_EXECUTOR_STATUS_COMPLETED = 'completed';
export const AGENT_EXECUTOR_STATUS_UNSUPPORTED = 'unsupported_source';

export interface ToolExecutorDeps {
  now?: () => string;
}

const TOOL_LABELS: Record<AgentLocale, Record<string, string>> = {
  ar: {
    import_product: 'استيراد المنتج',
    analyze_market: 'تحليل السوق',
    generate_campaign: 'توليد الحملة',
    design_creative: 'التوجيه الإبداعي',
    generate_media: 'توليد الوسائط',
    render_video: 'إخراج الفيديو',
    export_campaign: 'تصدير الحملة',
  },
  fr: {
    import_product: 'Importer le produit',
    analyze_market: 'Analyser le marché',
    generate_campaign: 'Générer la campagne',
    design_creative: 'Direction créative',
    generate_media: 'Générer les médias',
    render_video: 'Rendu vidéo',
    export_campaign: 'Exporter la campagne',
  },
  en: {
    import_product: 'Import product',
    analyze_market: 'Analyze market',
    generate_campaign: 'Generate campaign',
    design_creative: 'Creative direction',
    generate_media: 'Generate media',
    render_video: 'Render video',
    export_campaign: 'Export campaign',
  },
};

const MESSAGE_TEMPLATES: Record<AgentLocale, (label: string) => string> = {
  ar: (label) => `تم استلام طلب "${label}". هذه القدرة قيد التوصيل بالخدمة الخلفية وسيتم تنفيذها فعليًا في مرحلة لاحقة.`,
  fr: (label) => `Requête « ${label} » reçue. Cette capacité est en cours de connexion au backend et sera exécutée ultérieurement.`,
  en: (label) => `Received "${label}" request. This capability is being wired to the backend and will run for real in a later phase.`,
};

function resolveLocale(locale: AgentLocale): AgentLocale {
  return TOOL_LABELS[locale] ? locale : 'ar';
}

function describeExecution(name: string, locale: AgentLocale): string {
  const safeLocale = resolveLocale(locale);
  const label = TOOL_LABELS[safeLocale][name] ?? name;
  return MESSAGE_TEMPLATES[safeLocale](label);
}

function textForImportedProduct(product: ExtractedProduct, locale: AgentLocale): string {
  const imageCount = product.images?.length ?? 0;
  const price = product.price === null || product.price === undefined ? '—' : `${product.price} ${product.currency || ''}`.trim();
  if (locale === 'fr') {
    return [
      'Produit importé depuis le lien.',
      `Nom: ${product.name}`,
      `Marque: ${product.brand || product.vendor || '—'}`,
      `Catégorie: ${product.category || '—'}`,
      `Prix: ${price}`,
      `Images trouvées: ${imageCount}`,
      product.extractionError ? `Note: ${product.extractionError}` : '',
    ].filter(Boolean).join('\n');
  }
  if (locale === 'en') {
    return [
      'Product imported from the link.',
      `Name: ${product.name}`,
      `Brand: ${product.brand || product.vendor || '—'}`,
      `Category: ${product.category || '—'}`,
      `Price: ${price}`,
      `Images found: ${imageCount}`,
      product.extractionError ? `Note: ${product.extractionError}` : '',
    ].filter(Boolean).join('\n');
  }
  return [
    'تم استيراد المنتج من الرابط.',
    `الاسم: ${product.name}`,
    `العلامة: ${product.brand || product.vendor || '—'}`,
    `الفئة: ${product.category || '—'}`,
    `السعر: ${price}`,
    `عدد الصور الموجودة: ${imageCount}`,
    product.extractionError ? `ملاحظة: ${product.extractionError}` : '',
  ].filter(Boolean).join('\n');
}

function makeFacadeExecutor(name: string, now: () => string): ToolExecutor {
  return async (call: AgentToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    validateToolCall(call);
    const def = getToolDefinition(name);
    return {
      content: describeExecution(name, context.locale),
      creditsCharged: 0,
      toolResult: {
        tool: name,
        status: AGENT_EXECUTOR_STATUS_PENDING,
        category: def?.category ?? null,
        chargesCredits: def?.chargesCredits ?? false,
        arguments: call.arguments,
        conversationId: context.conversationId,
        workspaceId: context.workspaceId,
        requestedAt: now(),
      },
    };
  };
}

function makeImportProductExecutor(now: () => string): ToolExecutor {
  return async (call: AgentToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    validateToolCall(call);
    const source = String(call.arguments.source || '').trim();
    const sourceType = String(call.arguments.sourceType || '').trim();

    if (sourceType !== 'url') {
      return {
        content:
          context.locale === 'ar'
            ? 'استيراد المنتج من الصور لم يتم ربطه بعد. أرسل رابط منتج حاليًا.'
            : context.locale === 'fr'
              ? 'L’import depuis image n’est pas encore connecté. Envoyez un lien produit pour le moment.'
              : 'Image-based product import is not connected yet. Please send a product link for now.',
        creditsCharged: 0,
        toolResult: {
          tool: call.name,
          status: AGENT_EXECUTOR_STATUS_UNSUPPORTED,
          reason: 'image_import_not_connected',
          sourceType,
          requestedAt: now(),
          workspaceId: context.workspaceId,
          conversationId: context.conversationId,
        },
      };
    }

    const safeUrl = await assertPublicProductUrl(source);
    const platform = validateShopifyUrl(safeUrl) ? 'shopify' : 'generic_url';

    if (platform !== 'shopify') {
      return {
        content:
          context.locale === 'ar'
            ? 'وصلني الرابط وهو آمن، لكن الاستيراد الحقيقي موصول حاليًا بروابط Shopify التي تحتوي على /products/. أرسل رابط منتج Shopify أو سنربط المستخرج العام في الخطوة التالية.'
            : context.locale === 'fr'
              ? 'Le lien est sûr, mais l’import réel est actuellement connecté aux liens Shopify contenant /products/. Envoyez un lien Shopify ou nous connecterons l’extracteur générique ensuite.'
              : 'The link is safe, but live import is currently wired for Shopify product links containing /products/. Send a Shopify product link, or we will connect the generic extractor next.',
        creditsCharged: 0,
        toolResult: {
          tool: call.name,
          status: AGENT_EXECUTOR_STATUS_UNSUPPORTED,
          reason: 'generic_url_extractor_not_connected',
          sourceUrl: safeUrl,
          sourcePlatform: platform,
          requestedAt: now(),
          workspaceId: context.workspaceId,
          conversationId: context.conversationId,
        },
      };
    }

    const product = await scrapeShopifyProduct(safeUrl, null);
    return {
      content: textForImportedProduct(product, context.locale),
      creditsCharged: 0,
      toolResult: {
        tool: call.name,
        status: AGENT_EXECUTOR_STATUS_COMPLETED,
        sourceUrl: safeUrl,
        sourcePlatform: product.source_platform || platform,
        product,
        requestedAt: now(),
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
      },
    };
  };
}

export function createToolExecutors(deps: ToolExecutorDeps = {}): Record<string, ToolExecutor> {
  const now = deps.now ?? (() => new Date().toISOString());
  const registry: Record<string, ToolExecutor> = {};
  for (const name of AGENT_TOOL_NAMES) {
    registry[name] = name === 'import_product' ? makeImportProductExecutor(now) : makeFacadeExecutor(name, now);
  }
  return registry;
}
