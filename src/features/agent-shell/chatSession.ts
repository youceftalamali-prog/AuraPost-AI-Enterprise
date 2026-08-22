import type { AgentChatMessage } from './agentChatApi';

// Pure, React-free helpers for reconciling optimistic chat state with the
// messages returned by the server. Extracted so the merge logic is unit
// testable without a DOM or network.

let optimisticCounter = 0;

/** Build a local, optimistic user message to render immediately on send. */
export function optimisticUserMessage(content: string): AgentChatMessage {
  optimisticCounter += 1;
  return {
    id: `optimistic-${Date.now()}-${optimisticCounter}`,
    role: 'user',
    content,
    status: 'complete',
  };
}

/**
 * Merge the server-returned turn messages into the existing list.
 * - Drops the optimistic placeholder when the turn echoes a user message.
 * - Keeps the optimistic message when the turn contains no user message.
 * - De-duplicates by id, preserving order.
 */
export function mergeTurnMessages(
  existing: AgentChatMessage[],
  optimisticId: string,
  turnMessages: AgentChatMessage[],
): AgentChatMessage[] {
  const turnHasUser = turnMessages.some((message) => message.role === 'user');
  const base = turnHasUser ? existing.filter((message) => message.id !== optimisticId) : existing;
  const seen = new Set(base.map((message) => message.id));
  const merged = [...base];
  for (const message of turnMessages) {
    if (!seen.has(message.id)) {
      seen.add(message.id);
      merged.push(message);
    }
  }
  return merged;
}
