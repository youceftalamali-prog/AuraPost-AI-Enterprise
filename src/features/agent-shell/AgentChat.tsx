import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Bot,
  ChevronDown,
  ImagePlus,
  Link2,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Square,
  User,
  WandSparkles,
  Wrench,
} from 'lucide-react';
import type { AgentLocale } from './types';
import type { AgentChatMessage } from './agentChatApi';
import { AGENT_CHAT_COPY, bubbleAlignment, canSend, isRtlLocale, toolLabel } from './chatView';

interface AgentChatProps {
  locale: AgentLocale;
  messages: AgentChatMessage[];
  isSending?: boolean;
  error?: string | null;
  onSend: (content: string) => void;
  onQuickPrompt?: (content: string) => void;
}

const quickPrompts: Record<AgentLocale, Array<{ label: string; prompt: string }>> = {
  ar: [
    { label: 'رابط منتج', prompt: 'أريد إنشاء إعلان من رابط منتج. اطلب مني الرابط ثم حلله.' },
    { label: 'صورة إعلانية', prompt: 'أريد إنشاء صورة إعلانية احترافية لمنتج.' },
    { label: 'فيديو 4K', prompt: 'أريد إنشاء فيديو إعلاني 4K قصير لمنتج.' },
    { label: 'قالب جاهز', prompt: 'اعرض لي أفضل القوالب الجاهزة لهذا النوع من المنتجات.' },
  ],
  fr: [
    { label: 'Lien produit', prompt: 'Je veux créer une publicité à partir d’un lien produit. Demande-moi le lien puis analyse-le.' },
    { label: 'Image pub', prompt: 'Je veux créer une image publicitaire professionnelle pour un produit.' },
    { label: 'Vidéo 4K', prompt: 'Je veux créer une courte vidéo publicitaire 4K pour un produit.' },
    { label: 'Modèle prêt', prompt: 'Montre-moi les meilleurs modèles prêts pour ce type de produit.' },
  ],
  en: [
    { label: 'Product link', prompt: 'I want to create an ad from a product link. Ask me for the link, then analyze it.' },
    { label: 'Ad image', prompt: 'I want to create a professional ad image for a product.' },
    { label: '4K video', prompt: 'I want to create a short 4K product ad video.' },
    { label: 'Template', prompt: 'Show me the best ready templates for this product type.' },
  ],
};

const assistantIntro: Record<AgentLocale, { title: string; subtitle: string; placeholder: string; disclaimer: string; cloud: string }> = {
  ar: {
    title: 'Assistant Aura',
    subtitle: 'صانع فيديوهات وصور إعلانية بالذكاء الاصطناعي',
    placeholder: 'أرسل رابط المنتج، صورة، أو وصف الإعلان...',
    disclaimer: 'قد يحتوي المحتوى المولد بالذكاء الاصطناعي على أخطاء. يرجى التحقق.',
    cloud: 'Cloud',
  },
  fr: {
    title: 'Assistant Aura',
    subtitle: 'Créer des vidéos et images publicitaires avec l’IA',
    placeholder: 'Envoyez un lien produit, une image ou une description...',
    disclaimer: "Le contenu généré par l'IA peut contenir des erreurs. Veuillez vérifier.",
    cloud: 'Cloud',
  },
  en: {
    title: 'Assistant Aura',
    subtitle: 'Create AI product ad videos and images',
    placeholder: 'Send a product link, image, or ad description...',
    disclaimer: 'AI-generated content may contain errors. Please verify.',
    cloud: 'Cloud',
  },
};

function ChatRow({ message, locale }: { message: AgentChatMessage; locale: AgentLocale }) {
  const text = AGENT_CHAT_COPY[locale];

  if (message.role === 'tool') {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-sm">
          <Wrench className="h-3 w-3 text-emerald-500" />
          {text.toolUsed}: {toolLabel(message.toolName ?? '', locale)}
        </span>
      </div>
    );
  }

  const isUser = message.role === 'user';
  const align = bubbleAlignment(message.role);

  return (
    <div className={`flex gap-2 ${align === 'end' ? 'flex-row-reverse' : 'flex-row'}`}>
      <span
        className={`mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-xl shadow-sm ${
          isUser ? 'bg-violet-600 text-white' : 'bg-white text-emerald-600 ring-1 ring-emerald-100'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className="max-w-[82%] space-y-2">
        {message.content && (
          <div
            className={`whitespace-pre-wrap rounded-[24px] px-4 py-3 text-[15px] leading-7 shadow-sm ${
              isUser ? 'bg-emerald-100 text-zinc-900' : 'bg-white text-zinc-900 ring-1 ring-zinc-200/70'
            }`}
          >
            {message.content}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((call) => (
              <span key={call.id} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] text-violet-700">
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

export function AgentChat({ locale, messages, isSending = false, error = null, onSend, onQuickPrompt }: AgentChatProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const text = AGENT_CHAT_COPY[locale];
  const intro = assistantIntro[locale];
  const rtl = isRtlLocale(locale);
  const visible = messages.filter((message) => message.role !== 'system');
  const hasMessages = visible.length > 0;

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
    <section dir={rtl ? 'rtl' : 'ltr'} className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-56 pt-2 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {!hasMessages ? (
            <div className="flex min-h-[calc(100vh-22rem)] flex-col items-center justify-center text-center">
              <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-full bg-lime-200 shadow-inner shadow-white/70">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 text-3xl font-black text-white shadow-xl">
                  A
                </div>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl">{intro.title}</h1>
              <p className="mt-4 max-w-md text-xl leading-8 text-zinc-500">{intro.subtitle}</p>
              <button type="button" className="mt-7 inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 text-lg font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-200">
                <WandSparkles className="h-5 w-5 text-violet-600" />
                {locale === 'ar' ? 'تغيير الوكيل' : locale === 'fr' ? 'Changer d’Agent' : 'Change Agent'}
              </button>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {visible.map((message) => <ChatRow key={message.id} message={message} locale={locale} />)}
              {isSending && (
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  {text.sending}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#f8f8f8] via-[#f8f8f8]/95 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickPrompts[locale].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onQuickPrompt?.(item.prompt)}
                className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && <div className="mb-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div>}

          <form onSubmit={submit} className="overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-200">
            <div className="px-4 py-4">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={intro.placeholder}
                rows={2}
                className="min-h-16 w-full resize-none bg-transparent px-1 text-[17px] leading-7 text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 text-zinc-900">
                    <Plus className="h-6 w-6" />
                  </button>
                  <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 text-zinc-700">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button type="button" className="hidden h-12 w-12 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 sm:flex">
                    <ImagePlus className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" className="inline-flex h-12 items-center gap-1 rounded-full border border-zinc-200 px-4 text-sm font-bold text-zinc-800">
                    Auto <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 text-zinc-800">
                    <Mic className="h-5 w-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!canSend(draft) || isSending}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-500">
              <Link2 className="h-4 w-4" />
              {intro.cloud}
              <ChevronDown className="h-4 w-4" />
            </div>
          </form>

          <p className="mt-4 text-center text-sm leading-6 text-zinc-500">{intro.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
