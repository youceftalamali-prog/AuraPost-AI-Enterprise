import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, Loader2, Send, Sparkles, User, Wrench } from 'lucide-react';
import type { AgentLocale } from './types';
import type { AgentChatMessage } from './agentChatApi';
import { AGENT_CHAT_COPY, bubbleAlignment, canSend, isRtlLocale, toolLabel } from './chatView';

interface AgentChatProps {
  locale: AgentLocale;
  messages: AgentChatMessage[];
  isSending?: boolean;
  error?: string | null;
  onSend: (content: string) => void;
}

function ChatRow({ message, locale }: { message: AgentChatMessage; locale: AgentLocale }) {
  const text = AGENT_CHAT_COPY[locale];

  if (message.role === 'tool') {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-slate-300">
          <Wrench className="h-3 w-3 text-emerald-300" />
          {text.toolUsed}: {toolLabel(message.toolName ?? '', locale)}
        </span>
      </div>
    );
  }

  const isUser = message.role === 'user';
  const align = bubbleAlignment(message.role);

  return (
    <div className={`flex gap-2 ${align === 'end' ? 'flex-row-reverse' : 'flex-row'}`}>
      <span className={`mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg ${isUser ? 'bg-indigo-500/20 text-indigo-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className="max-w-[78%] space-y-2">
        {message.content && (
          <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${isUser ? 'bg-indigo-500/15 text-indigo-50' : 'bg-white/[0.04] text-slate-100'}`}>
            {message.content}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((call) => (
              <span key={call.id} className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-0.5 text-[11px] text-indigo-200">
                <Wrench className="h-3 w-3" />
                {toolLabel(call.name, locale)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentChat({ locale, messages, isSending = false, error = null, onSend }: AgentChatProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const text = AGENT_CHAT_COPY[locale];
  const rtl = isRtlLocale(locale);
  const visible = messages.filter((message) => message.role !== 'system');

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending]);

  const send = () => {
    const trimmed = draft.trim();
    if (!canSend(trimmed) || isSending) return;
    onSend(trimmed);
    setDraft('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-indigo-400/20 bg-[#11131d] shadow-2xl">
      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500">
          <Sparkles className="h-5 w-5 text-white" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">{text.title}</h2>
          <p className="text-xs text-slate-400">{text.subtitle}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
            <Bot className="h-8 w-8 text-indigo-300" />
            <p className="max-w-sm text-sm">{text.empty}</p>
          </div>
        ) : (
          visible.map((message) => <ChatRow key={message.id} message={message} locale={locale} />)
        )}
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {text.sending}
          </div>
        )}
      </div>

      {error && <div className="border-t border-red-400/20 bg-red-500/10 px-5 py-2 text-xs text-red-200">{error}</div>}

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-white/10 bg-black/20 p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={text.placeholder}
          rows={2}
          className="min-h-12 flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!canSend(draft) || isSending}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
