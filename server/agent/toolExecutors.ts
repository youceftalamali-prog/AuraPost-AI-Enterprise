// Injectable tool executor registry for the Phase 3 conversational agent (t143).
//
// `runToolCallingLoop` takes a `Record<string, ToolExecutor>`; this module
// builds that registry for the 7 capabilities defined in toolCallingModel.
//
// These are deliberately FACADE executors: the real downstream services
// (product import, market analysis, media/video render, export) are built in
// Phase 5. Until then each executor validates its call and returns a
// structured, GATED result: `creditsCharged: 0` and a `pending_backend`
// status, so the loop is fully runnable and unit tested now without charging
// credits or performing any I/O. Swapping a facade for a live executor later is
// a one-line change in `createToolExecutors`.
import { type AgentLocale } from './contracts';
import { AGENT_TOOL_NAMES, getToolDefinition, validateToolCall, type AgentToolCall } from './toolCallingModel';
import type { ToolExecutionContext, ToolExecutionResult, ToolExecutor } from './toolCallingLoop';

/** Status stamped on facade results until the real backend is wired (Phase 5). */
export const AGENT_EXECUTOR_STATUS_PENDING = 'pending_backend';

export interface ToolExecutorDeps {
  /** Injectable clock so tests are deterministic. */
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

function makeFacadeExecutor(name: string, now: () => string): ToolExecutor {
  return async (call: AgentToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    // Defensive re-validation; the loop validates too, but executors must never
    // trust their input blindly.
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

/**
 * Builds the tool name -> executor registry passed to `runToolCallingLoop`.
 * Every tool in the registry gets a facade executor. Replace individual entries
 * with live executors as Phase 5 lands them.
 */
export function createToolExecutors(deps: ToolExecutorDeps = {}): Record<string, ToolExecutor> {
  const now = deps.now ?? (() => new Date().toISOString());
  const registry: Record<string, ToolExecutor> = {};
  for (const name of AGENT_TOOL_NAMES) {
    registry[name] = makeFacadeExecutor(name, now);
  }
  return registry;
}
