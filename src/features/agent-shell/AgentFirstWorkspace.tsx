import { useEffect, useState } from 'react';
import { Languages, LogOut, Settings, Wallet } from 'lucide-react';
import type { Session } from '../../types';
import { AgentChat } from './AgentChat';
import { useAgentChat } from './useAgentChat';
import type { AgentLocale } from './types';

interface Props {
  session: Session;
  testMode: boolean;
  onLogout: () => void | Promise<void>;
  onAddAuditLog: (action: string, details: string) => void;
}

function validLocale(value: string): value is AgentLocale {
  return value === 'ar' || value === 'fr' || value === 'en';
}

export function AgentFirstWorkspace({ session, testMode, onLogout, onAddAuditLog }: Props) {
  const [locale, setLocale] = useState<AgentLocale>('ar');
  const chat = useAgentChat(locale);
  const displayName =
    session.user.full_name ||
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    session.user.email;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    return () => {
      document.documentElement.dir = 'ltr';
    };
  }, [locale]);

  const handleQuickPrompt = (prompt: string) => {
    onAddAuditLog('agent.quick_prompt', prompt);
    void chat.send(prompt);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#effdf6] via-[#eef8fb] to-[#f8f8f8] text-zinc-950">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="shrink-0 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Aura menu"
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-emerald-900/5 ring-1 ring-zinc-200/70"
            >
              <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
              <span className="block h-0.5 w-6 rounded-full bg-zinc-800 before:block before:h-0.5 before:w-4 before:-translate-y-2 before:rounded-full before:bg-zinc-800 after:block after:h-0.5 after:w-3 after:translate-y-1.5 after:rounded-full after:bg-zinc-800" />
            </button>

            <button type="button" onClick={() => chat.reset()} className="min-w-0 text-center">
              <div className="text-2xl font-black tracking-tight sm:text-3xl">
                <span className="bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent">Aura</span>Post AI
              </div>
              <div className="truncate text-[11px] font-medium text-zinc-500">{displayName}</div>
            </button>

            <div className="flex items-center gap-2">
              <label className="hidden items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 sm:flex">
                <Languages className="h-4 w-4" />
                <select
                  value={locale}
                  onChange={(event) => validLocale(event.target.value) && setLocale(event.target.value)}
                  className="bg-transparent outline-none"
                  aria-label="Interface language"
                >
                  <option value="ar">AR</option>
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
              </label>
              <button type="button" className="hidden rounded-full bg-white p-3 text-zinc-700 shadow-sm ring-1 ring-zinc-200 sm:inline-flex">
                <Wallet className="h-5 w-5" />
              </button>
              <button type="button" className="hidden rounded-full bg-white p-3 text-zinc-700 shadow-sm ring-1 ring-zinc-200 sm:inline-flex">
                <Settings className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="rounded-full bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20"
              >
                <span className="hidden sm:inline">خروج</span>
                <LogOut className="h-5 w-5 sm:hidden" />
              </button>
            </div>
          </div>
          {testMode && (
            <div className="mx-auto mt-2 max-w-5xl rounded-2xl bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-800">
              Test mode is active
            </div>
          )}
        </header>

        <AgentChat
          locale={locale}
          messages={chat.messages}
          isSending={chat.isSending}
          error={chat.error}
          onSend={chat.send}
          onQuickPrompt={handleQuickPrompt}
        />
      </div>
    </div>
  );
}
