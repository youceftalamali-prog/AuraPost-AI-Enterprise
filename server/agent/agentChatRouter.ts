// Conversational agent HTTP surface for Phase 3 (t143 part 3b).
//
// This is the router the frontend `agentChatApi.ts` already targets:
//   GET    /api/agent/conversations                    -> list
//   POST   /api/agent/conversations                    -> create (+ first turn)
//   GET    /api/agent/conversations/:id                -> load turn
//   POST   /api/agent/conversations/:id/messages       -> send + run agent turn
//
// It is thin wiring on top of already-unit-tested pieces: the PG conversation
// store (persistence), the tool-calling loop (orchestration), the OpenRouter
// provider (LLM), and the facade tool executors. The live provider is GATED:
// without OPENROUTER_API_KEY the loop throws AGENT_PROVIDER_NOT_CONFIGURED and
// we answer 503, so the endpoint degrades cleanly (and CI stays green / no cost)
// until the key is set on the deployed VPS.
import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { AGENT_LOCALES, type AgentLocale } from './contracts';
import {
  AgentConversationError,
  normalizeAppendMessage,
  normalizeCreateConversation,
  type AppendMessageInput,
} from './conversationContracts';
import {
  AGENT_CONVERSATION_NOT_FOUND,
  createConversationStore,
  type ConversationStore,
  type PoolLike,
} from './conversationStore';
import { AgentToolError, buildSystemPrompt, type StoredMessageLike } from './toolCallingModel';
import { runToolCallingLoop, type ProviderComplete, type ToolExecutor } from './toolCallingLoop';
import {
  AGENT_PROVIDER_NOT_CONFIGURED,
  AgentProviderError,
  createOpenRouterProvider,
} from './openRouterProvider';
import { createToolExecutors } from './toolExecutors';

type AuthenticatedRequest = Request & {
  workspaceId?: string;
  user?: { userId?: string };
};

interface ChatDeps {
  store: ConversationStore;
  provider: ProviderComplete;
  executors: Record<string, ToolExecutor>;
}

export interface AgentChatRouterOptions {
  /** Injectable provider (tests / alternative LLMs). Defaults to OpenRouter. */
  provider?: ProviderComplete;
  /** Injectable executor registry. Defaults to the facade registry. */
  executors?: Record<string, ToolExecutor>;
}

function authContext(req: AuthenticatedRequest) {
  const workspaceId = req.workspaceId;
  const userId = req.user?.userId;
  if (!workspaceId || !userId) {
    throw new AgentConversationError('AGENT_AUTH_CONTEXT_MISSING', 'Authenticated workspace context is required.');
  }
  return { workspaceId, userId };
}

function resolveLocale(value: unknown): AgentLocale {
  return AGENT_LOCALES.includes(value as AgentLocale) ? (value as AgentLocale) : 'ar';
}

function sendError(res: Response, error: unknown) {
  if (error instanceof AgentProviderError) {
    const status = error.code === AGENT_PROVIDER_NOT_CONFIGURED ? 503 : 502;
    return res.status(status).json({ error: error.message, code: error.code });
  }
  if (error instanceof AgentToolError) {
    return res.status(400).json({ error: error.message, code: error.code });
  }
  if (error instanceof AgentConversationError) {
    const status =
      error.code === 'AGENT_AUTH_CONTEXT_MISSING' ? 401 : error.code === AGENT_CONVERSATION_NOT_FOUND ? 404 : 400;
    return res.status(status).json({ error: error.message, code: error.code });
  }
  throw error;
}

/**
 * Runs one assistant turn for an existing conversation: loads the full history,
 * prepends the localized system prompt, runs the tool-calling loop, then
 * persists every generated message (assistant + tool) in order. Returns the
 * persisted, serialized messages so the caller can return them to the client.
 */
async function runAssistantTurn(
  deps: ChatDeps,
  ctx: { workspaceId: string; userId: string; conversationId: string },
) {
  const loaded = await deps.store.loadConversation({
    conversationId: ctx.conversationId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });
  if (!loaded) {
    throw new AgentConversationError(AGENT_CONVERSATION_NOT_FOUND, 'Conversation not found for this user.');
  }

  const locale = resolveLocale(loaded.conversation.locale);
  const history: StoredMessageLike[] = [
    { role: 'system', content: buildSystemPrompt(locale) },
    ...loaded.messages.map((message) => ({
      role: message.role as StoredMessageLike['role'],
      content: message.content,
      toolName: message.toolName ?? undefined,
      toolCallId: message.toolCallId ?? undefined,
      toolCalls: message.toolCalls ?? undefined,
    })),
  ];

  const result = await runToolCallingLoop({
    history,
    complete: deps.provider,
    executors: deps.executors,
    context: { workspaceId: ctx.workspaceId, userId: ctx.userId, conversationId: ctx.conversationId, locale },
  });

  const persisted: Array<Awaited<ReturnType<ConversationStore['appendMessage']>>['message']> = [];
  for (const generated of result.appended) {
    const message: AppendMessageInput = {
      role: generated.role,
      content: generated.content,
      status: 'complete',
      toolName: generated.toolName ?? undefined,
      toolCallId: generated.toolCallId ?? undefined,
      toolCalls: (generated.toolCalls as Record<string, unknown> | undefined) ?? undefined,
      toolResult: generated.toolResult,
      provider: generated.provider,
      model: generated.model,
    };
    const saved = await deps.store.appendMessage({
      conversationId: ctx.conversationId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      message,
      creditsCharged: generated.creditsCharged ?? 0,
    });
    persisted.push(saved.message);
  }
  return persisted;
}

export function createAuraAgentChatRouter(pool: Pool, options: AgentChatRouterOptions = {}): Router {
  const router = Router();
  const store = createConversationStore(pool as unknown as PoolLike);
  const provider =
    options.provider ??
    createOpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL,
      referer: process.env.OPENROUTER_REFERER,
      title: 'AuraPost Agent',
    });
  const executors = options.executors ?? createToolExecutors();
  const deps: ChatDeps = { store, provider, executors };

  router.get('/conversations', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const conversations = await store.listConversations({ workspaceId, userId });
      return res.json({ conversations });
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.get('/conversations/:conversationId', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const turn = await store.loadConversation({ conversationId: req.params.conversationId, workspaceId, userId });
      if (!turn) return res.status(404).json({ error: 'Aura conversation not found.', code: AGENT_CONVERSATION_NOT_FOUND });
      return res.json(turn);
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post('/conversations', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const initialText = typeof body.message === 'string' ? body.message : undefined;
      const input = normalizeCreateConversation({
        title: body.title,
        locale: body.locale,
        sourceMode: body.sourceMode,
        workflowId: body.workflowId,
        metadata: body.metadata,
        initialMessage: initialText ? { role: 'user', content: initialText } : undefined,
      });
      const created = await store.createConversation({ workspaceId, userId, input });
      if (!input.initialMessage) {
        return res.status(201).json({ conversation: created.conversation, messages: created.messages });
      }
      const assistantMessages = await runAssistantTurn(deps, {
        workspaceId,
        userId,
        conversationId: created.conversation.id,
      });
      const latest = await store.loadConversation({ conversationId: created.conversation.id, workspaceId, userId });
      return res.status(201).json({
        conversation: latest ? latest.conversation : created.conversation,
        messages: [...created.messages, ...assistantMessages],
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post('/conversations/:conversationId/messages', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const conversationId = req.params.conversationId;
      const existing = await store.loadConversation({ conversationId, workspaceId, userId });
      if (!existing) return res.status(404).json({ error: 'Aura conversation not found.', code: AGENT_CONVERSATION_NOT_FOUND });
      const body = (req.body ?? {}) as Record<string, unknown>;
      const userMessage = normalizeAppendMessage({ role: 'user', content: body.content, status: 'complete' });
      const savedUser = await store.appendMessage({ conversationId, workspaceId, userId, message: userMessage });
      const assistantMessages = await runAssistantTurn(deps, { workspaceId, userId, conversationId });
      const latest = await store.loadConversation({ conversationId, workspaceId, userId });
      return res.json({
        conversation: latest ? latest.conversation : existing.conversation,
        messages: [savedUser.message, ...assistantMessages],
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  return router;
}
