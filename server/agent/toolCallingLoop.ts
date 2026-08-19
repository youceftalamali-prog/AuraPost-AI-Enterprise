// Pure, dependency-injected orchestrator for the Phase 3 tool-calling loop.
//
// This is the runtime heart of the conversational agent (t143): it drives the
// model<->tool round trip that replaces the old fixed `current_step` pipeline.
// It intentionally takes the provider completion function and the tool executor
// registry as INJECTED dependencies, so the orchestration can be unit tested in
// isolation without any live LLM call, database, or network I/O. The concrete
// executors (import_product, analyze_market, render_video, ...) and the real
// OpenRouter HTTP provider are wired on top of this in a follow-up change.
import { type AgentLocale } from './contracts';
import {
  AGENT_TOOLS,
  AGENT_TOOL_LOOP,
  AgentToolError,
  serializeToolCalls,
  toProviderMessages,
  toProviderTools,
  validateToolCall,
  type AgentToolCall,
  type AgentToolDefinition,
  type ProviderMessage,
  type ProviderTool,
  type StoredMessageLike,
} from './toolCallingModel';

export const AGENT_LOOP_LIMIT_ERROR = 'AGENT_TOOL_LOOP_LIMIT';

/** Context handed to every tool executor for the current conversation turn. */
export interface ToolExecutionContext {
  workspaceId: string;
  userId: string;
  conversationId: string;
  locale: AgentLocale;
}

/** What a tool executor returns after doing its work. */
export interface ToolExecutionResult {
  /** Human/model-readable summary of the result (stored as message content). */
  content: string;
  /** Structured payload persisted alongside the tool message. */
  toolResult?: Record<string, unknown>;
  /** Credits actually consumed by this invocation. */
  creditsCharged?: number;
}

export type ToolExecutor = (call: AgentToolCall, context: ToolExecutionContext) => Promise<ToolExecutionResult>;

export interface ProviderCompletion {
  /** Assistant natural-language content (may be empty when only calling tools). */
  content: string;
  /** Tool calls the model wants to make this turn; empty/absent => final answer. */
  toolCalls?: AgentToolCall[];
  provider?: string;
  model?: string;
}

export type ProviderComplete = (input: {
  messages: ProviderMessage[];
  tools: ProviderTool[];
}) => Promise<ProviderCompletion>;

/** A message produced by the loop, ready to hand to the persistence layer. */
export interface LoopMessage extends StoredMessageLike {
  toolResult?: Record<string, unknown>;
  creditsCharged?: number;
  provider?: string;
  model?: string;
}

export interface LoopResult {
  /** New messages generated this turn, in order, ready to persist. */
  appended: LoopMessage[];
  /** The assistant's final natural-language answer. */
  finalContent: string;
  /** Number of model completions performed. */
  iterations: number;
  /** Number of tool executions performed. */
  toolCallsMade: number;
  /** Total credits consumed across all tool executions this turn. */
  creditsCharged: number;
}

export interface RunToolCallingLoopArgs {
  /** Prior conversation messages (already persisted), oldest first. */
  history: StoredMessageLike[];
  /** Injected provider completion function. */
  complete: ProviderComplete;
  /** Tool name -> executor. */
  executors: Record<string, ToolExecutor>;
  context: ToolExecutionContext;
  /** Tool subset exposed to the model; defaults to the full registry. */
  tools?: readonly AgentToolDefinition[];
  /** Override the max model<->tool round trips. */
  maxIterations?: number;
}

/**
 * Runs the tool-calling loop until the model returns a final answer (no tool
 * calls) or the iteration budget is exhausted. Returns only the newly generated
 * messages so the caller can persist them and stream them to the client.
 */
export async function runToolCallingLoop(args: RunToolCallingLoopArgs): Promise<LoopResult> {
  const tools = args.tools ?? AGENT_TOOLS;
  const providerTools = toProviderTools(tools);
  const maxIterations = Math.max(1, args.maxIterations ?? AGENT_TOOL_LOOP.maxIterations);

  const working: LoopMessage[] = [...args.history];
  const appended: LoopMessage[] = [];
  let iterations = 0;
  let toolCallsMade = 0;
  let creditsCharged = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    const completion = await args.complete({ messages: toProviderMessages(working), tools: providerTools });
    const calls = completion.toolCalls ?? [];

    if (calls.length === 0) {
      const finalContent = completion.content ?? '';
      const message: LoopMessage = { role: 'assistant', content: finalContent, provider: completion.provider, model: completion.model };
      working.push(message);
      appended.push(message);
      return { appended, finalContent, iterations, toolCallsMade, creditsCharged };
    }

    if (calls.length > AGENT_TOOL_LOOP.maxToolCallsPerTurn) {
      throw new AgentToolError(AGENT_LOOP_LIMIT_ERROR, `Model requested ${calls.length} tool calls in one turn (max ${AGENT_TOOL_LOOP.maxToolCallsPerTurn}).`);
    }

    // Validate before executing anything so a bad call fails fast.
    for (const call of calls) validateToolCall(call);

    const assistantMessage: LoopMessage = {
      role: 'assistant',
      content: completion.content ?? '',
      toolCalls: serializeToolCalls(calls),
      provider: completion.provider,
      model: completion.model,
    };
    working.push(assistantMessage);
    appended.push(assistantMessage);

    for (const call of calls) {
      const executor = args.executors[call.name];
      if (!executor) throw new AgentToolError(AGENT_LOOP_LIMIT_ERROR, `No executor registered for tool: ${call.name}`);
      const result = await executor(call, args.context);
      const charged = result.creditsCharged ?? 0;
      creditsCharged += charged;
      toolCallsMade += 1;
      const toolMessage: LoopMessage = {
        role: 'tool',
        content: result.content,
        toolName: call.name,
        toolCallId: call.id,
        toolResult: result.toolResult,
        creditsCharged: charged,
      };
      working.push(toolMessage);
      appended.push(toolMessage);
    }
  }

  throw new AgentToolError(AGENT_LOOP_LIMIT_ERROR, `Exceeded the tool-calling iteration budget (${maxIterations}) without a final answer.`);
}
