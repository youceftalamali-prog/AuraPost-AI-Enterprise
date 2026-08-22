import { useCallback, useState } from 'react';
import type { AgentLocale } from './types';
import {
  createAgentConversation,
  sendAgentChatMessage,
  type AgentChatMessage,
  type AgentConversation,
} from './agentChatApi';
import { mergeTurnMessages, optimisticUserMessage } from './chatSession';

export interface UseAgentChat {
  messages: AgentChatMessage[];
  conversation: AgentConversation | null;
  isSending: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
  reset: () => void;
}

/**
 * Owns the agent chat state for a single conversation. The first send creates a
 * conversation; subsequent sends append to it. User messages render optimistically
 * and roll back if the request fails.
 */
export function useAgentChat(locale: AgentLocale): UseAgentChat {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;
      setError(null);
      setIsSending(true);
      const optimistic = optimisticUserMessage(trimmed);
      setMessages((prev) => [...prev, optimistic]);
      try {
        const turn = conversation
          ? await sendAgentChatMessage(conversation.id, trimmed)
          : await createAgentConversation({ locale, message: trimmed });
        setConversation(turn.conversation);
        setMessages((prev) => mergeTurnMessages(prev, optimistic.id, turn.messages));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Aura chat request failed.');
        setMessages((prev) => prev.filter((message) => message.id !== optimistic.id));
      } finally {
        setIsSending(false);
      }
    },
    [conversation, isSending, locale],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setConversation(null);
    setError(null);
  }, []);

  return { messages, conversation, isSending, error, send, reset };
}
