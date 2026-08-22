// Pure, dependency-free tool-calling model for the Phase 3 conversational agent.
// This replaces the stepwise `current_step` pipeline (campaignBrief -> ... ->
// export) with an LLM tool-calling loop: the model decides which capability to
// invoke next based on the conversation, instead of the server advancing a
// fixed state machine.
//
// This module deliberately imports NO I/O (`pg`, fetch, providers) so it can be
// unit tested in isolation and reused by both the router and the loop runner.
// Actual tool execution is wired in t143; here we define the contract only.
import { AGENT_LOCALES, type AgentLocale } from './contracts';

export const AGENT_TOOL_ERROR = 'INVALID_AGENT_TOOL_CALL';

export class AgentToolError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AgentToolError';
  }
}

/** JSON-schema-ish parameter description for a single tool argument. */
export interface ToolParameter {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: readonly string[];
}

export interface AgentToolDefinition {
  /** Stable machine name the model emits; snake_case. */
  name: string;
  /** One-line capability summary shown to the model. */
  description: string;
  /** Broad grouping used for UI affordances and analytics. */
  category: 'ingest' | 'research' | 'generate' | 'media' | 'deliver';
  /** Whether invoking this tool consumes credits (affects confirmation UX). */
  chargesCredits: boolean;
  parameters: {
    properties: Record<string, ToolParameter>;
    required: readonly string[];
  };
}

// The initial capability surface. These mirror the old pipeline steps but are
// now individually invocable by the model in any order the conversation needs.
// Execution handlers are attached in t143; this list is the source of truth for
// what the model is allowed to call.
export const AGENT_TOOLS: readonly AgentToolDefinition[] = [
  {
    name: 'import_product',
    description: 'Import a product from a store URL or an uploaded image and extract its marketing attributes.',
    category: 'ingest',
    chargesCredits: false,
    parameters: {
      properties: {
        source: { type: 'string', description: 'Product page URL or uploaded image reference.' },
        sourceType: { type: 'string', description: 'How to interpret source.', enum: ['url', 'image'] },
      },
      required: ['source', 'sourceType'],
    },
  },
  {
    name: 'analyze_market',
    description: 'Run market and competitor analysis for a product or niche to ground the campaign in evidence.',
    category: 'research',
    chargesCredits: true,
    parameters: {
      properties: {
        topic: { type: 'string', description: 'Product name, niche, or keyword to analyze.' },
        locale: { type: 'string', description: 'Target market locale.', enum: ['ar', 'fr', 'en'] },
      },
      required: ['topic'],
    },
  },
  {
    name: 'generate_campaign',
    description: 'Generate the campaign brief and localized marketing copy for the product.',
    category: 'generate',
    chargesCredits: true,
    parameters: {
      properties: {
        productId: { type: 'string', description: 'Imported product identifier.' },
        goal: { type: 'string', description: 'Primary campaign goal, e.g. awareness or conversions.' },
        locale: { type: 'string', description: 'Output locale.', enum: ['ar', 'fr', 'en'] },
      },
      required: ['productId'],
    },
  },
  {
    name: 'design_creative',
    description: 'Produce the creative direction (tone, visual style, scene plan) for the campaign.',
    category: 'generate',
    chargesCredits: true,
    parameters: {
      properties: {
        campaignId: { type: 'string', description: 'Generated campaign identifier.' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'generate_media',
    description: 'Generate the campaign images / static creatives from the approved creative direction.',
    category: 'media',
    chargesCredits: true,
    parameters: {
      properties: {
        creativeId: { type: 'string', description: 'Approved creative direction identifier.' },
        count: { type: 'integer', description: 'Number of assets to generate.' },
      },
      required: ['creativeId'],
    },
  },
  {
    name: 'render_video',
    description: 'Render the marketing video (avatar + scenes + subtitles) for the campaign.',
    category: 'media',
    chargesCredits: true,
    parameters: {
      properties: {
        creativeId: { type: 'string', description: 'Approved creative direction identifier.' },
        locale: { type: 'string', description: 'Spoken/subtitle locale.', enum: ['ar', 'fr', 'en'] },
      },
      required: ['creativeId'],
    },
  },
  {
    name: 'export_campaign',
    description: 'Bundle the finished assets (copy, images, video) into a downloadable campaign package.',
    category: 'deliver',
    chargesCredits: false,
    parameters: {
      properties: {
        campaignId: { type: 'string', description: 'Campaign identifier to export.' },
      },
      required: ['campaignId'],
    },
  },
];

export const AGENT_TOOL_NAMES = AGENT_TOOLS.map((t) => t.name);

const TOOLS_BY_NAME = new Map<string, AgentToolDefinition>(AGENT_TOOLS.map((t) => [t.name, t]));

export function getToolDefinition(name: string): AgentToolDefinition | undefined {
  return TOOLS_BY_NAME.get(name);
}

/** Guardrails for the tool-calling loop runner (implemented in t143). */
export const AGENT_TOOL_LOOP = {
  /** Max model<->tool round trips before we force a final answer. */
  maxIterations: 8,
  /** Max tool calls the model may request in a single assistant turn. */
  maxToolCallsPerTurn: 4,
} as const;

// --- Provider tool schema (OpenAI / OpenRouter "tools" array) ---------------

export interface ProviderTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: readonly string[] }>;
      required: string[];
    };
  };
}

export function toProviderTools(tools: readonly AgentToolDefinition[] = AGENT_TOOLS): ProviderTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).map(([key, spec]) => [
            key,
            spec.enum ? { type: spec.type, description: spec.description, enum: spec.enum } : { type: spec.type, description: spec.description },
          ]),
        ),
        required: [...tool.parameters.required],
      },
    },
  }));
}

// --- Tool call (de)serialization for DB storage -----------------------------

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Canonical shape stored in aura_agent_messages.tool_calls. */
export interface StoredToolCalls {
  calls: AgentToolCall[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function serializeToolCalls(calls: readonly AgentToolCall[]): StoredToolCalls {
  return { calls: calls.map((c) => ({ id: c.id, name: c.name, arguments: c.arguments })) };
}

export function normalizeToolCalls(value: unknown): AgentToolCall[] {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.calls) ? value.calls : null;
  if (!list) throw new AgentToolError(AGENT_TOOL_ERROR, 'tool_calls must be an array or { calls: [] }.');
  return list.map((raw, index) => {
    if (!isRecord(raw)) throw new AgentToolError(AGENT_TOOL_ERROR, `tool_calls[${index}] must be an object.`);
    const id = typeof raw.id === 'string' && raw.id ? raw.id : null;
    const name = typeof raw.name === 'string' ? raw.name : (isRecord(raw.function) && typeof raw.function.name === 'string' ? raw.function.name : null);
    if (!id) throw new AgentToolError(AGENT_TOOL_ERROR, `tool_calls[${index}].id is required.`);
    if (!name) throw new AgentToolError(AGENT_TOOL_ERROR, `tool_calls[${index}].name is required.`);
    let args: unknown = raw.arguments;
    if (args === undefined && isRecord(raw.function)) args = raw.function.arguments;
    if (typeof args === 'string') {
      try { args = JSON.parse(args || '{}'); } catch { throw new AgentToolError(AGENT_TOOL_ERROR, `tool_calls[${index}].arguments is not valid JSON.`); }
    }
    if (args === undefined || args === null) args = {};
    if (!isRecord(args)) throw new AgentToolError(AGENT_TOOL_ERROR, `tool_calls[${index}].arguments must be an object.`);
    return { id, name, arguments: args };
  });
}

/**
 * Validates a single tool call against the registry: the tool must exist and
 * all required arguments must be present and non-empty. Returns the matched
 * definition so callers can branch on category / credit charging.
 */
export function validateToolCall(call: AgentToolCall): AgentToolDefinition {
  const def = TOOLS_BY_NAME.get(call.name);
  if (!def) throw new AgentToolError(AGENT_TOOL_ERROR, `Unknown tool: ${call.name}`);
  for (const key of def.parameters.required) {
    const value = call.arguments[key];
    if (value === undefined || value === null || value === '') {
      throw new AgentToolError(AGENT_TOOL_ERROR, `${call.name} is missing required argument: ${key}`);
    }
  }
  for (const [key, spec] of Object.entries(def.parameters.properties)) {
    const value = call.arguments[key];
    if (value !== undefined && value !== null && spec.enum && typeof value === 'string' && !spec.enum.includes(value)) {
      throw new AgentToolError(AGENT_TOOL_ERROR, `${call.name}.${key} must be one of: ${spec.enum.join(', ')}`);
    }
  }
  return def;
}

// --- Conversation -> provider message mapping -------------------------------

/** Minimal stored-message shape consumed from the persistence layer. */
export interface StoredMessageLike {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolName?: string | null;
  toolCallId?: string | null;
  toolCalls?: unknown;
}

export type ProviderMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }
  | { role: 'tool'; tool_call_id: string; content: string };

/**
 * Converts stored conversation messages into the provider chat format expected
 * by OpenAI-compatible endpoints (OpenRouter). Assistant messages that carry
 * tool calls are emitted with a `tool_calls` array (arguments JSON-stringified);
 * `tool` messages are emitted with their `tool_call_id`.
 */
export function toProviderMessages(messages: readonly StoredMessageLike[]): ProviderMessage[] {
  return messages.map((message) => {
    switch (message.role) {
      case 'system':
        return { role: 'system', content: message.content };
      case 'user':
        return { role: 'user', content: message.content };
      case 'tool': {
        if (!message.toolCallId) throw new AgentToolError(AGENT_TOOL_ERROR, 'tool message is missing toolCallId.');
        return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
      }
      case 'assistant': {
        const calls = message.toolCalls ? normalizeToolCalls(message.toolCalls) : [];
        if (calls.length === 0) return { role: 'assistant', content: message.content };
        return {
          role: 'assistant',
          content: message.content || null,
          tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.arguments) } })),
        };
      }
      default:
        throw new AgentToolError(AGENT_TOOL_ERROR, `Unsupported message role: ${(message as { role: string }).role}`);
    }
  });
}

// --- System prompt ----------------------------------------------------------

const SYSTEM_PROMPTS: Record<AgentLocale, string> = {
  ar: [
    'أنت "وكيل AuraPost"، مساعد تسويقي ذكي يحوّل منتجًا واحدًا إلى حملة إعلانية كاملة داخل محادثة واحدة.',
    'تحدث مع المستخدم بالعربية افتراضيًا. استخدم الأدوات المتاحة لاستيراد المنتج، تحليل السوق، توليد الحملة والإبداع والوسائط والفيديو، ثم التصدير.',
    'اطلب تأكيد المستخدم قبل أي أداة تستهلك نقاطًا. لا تخترع نتائج؛ اعتمد على مخرجات الأدوات فقط.',
  ].join(' '),
  fr: [
    'Vous êtes « AuraPost Agent », un assistant marketing qui transforme un produit en campagne complète dans une seule conversation.',
    'Utilisez les outils disponibles pour importer le produit, analyser le marché, générer la campagne, la direction créative, les médias et la vidéo, puis exporter.',
    'Demandez confirmation avant tout outil consommant des crédits. Ne fabriquez pas de résultats ; fiez-vous uniquement aux sorties des outils.',
  ].join(' '),
  en: [
    'You are "AuraPost Agent", a marketing assistant that turns a single product into a full ad campaign within one conversation.',
    'Use the available tools to import the product, analyze the market, generate the campaign, creative direction, media and video, then export.',
    'Ask for user confirmation before any credit-charging tool. Never fabricate results; rely only on tool outputs.',
  ].join(' '),
};

export function buildSystemPrompt(locale: AgentLocale = 'ar'): string {
  return SYSTEM_PROMPTS[AGENT_LOCALES.includes(locale) ? locale : 'ar'];
}
