import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import '../../styles/studio.css';
import { Icon, timecode } from './shared';
import { ErrorBoundary } from './ErrorBoundary';
import { usePolling } from '../../hooks/usePolling';
import { videoApi } from '../../services/videoApi';
import { JOB_POLL_INTERVAL_MS, ACTIVE_JOB_STATUSES } from '../../lib/constants';
import type { VideoJob } from '../../types/api';
import { Dashboard } from './sections/Dashboard';
import { ProductAnalyzer } from './sections/ProductAnalyzer';
import { Marketplace } from './sections/Marketplace';
import { GenerationStudio } from './sections/GenerationStudio';
import { QueueManager } from './sections/QueueManager';
import { HistorySection } from './sections/History';
import { ProvidersPanel } from './sections/ProvidersPanel';
import { BrandStudio } from './sections/BrandStudio';
import { SettingsPanel } from './sections/SettingsPanel';

export type StudioSection =
  | 'dashboard'
  | 'analyzer'
  | 'templates'
  | 'generate'
  | 'queue'
  | 'history'
  | 'providers'
  | 'brand'
  | 'settings';

export interface GenerationDraft {
  productId?: string;
  templateId?: string;
  platform?: string;
}

interface Toast {
  id: number;
  message: string;
  error?: boolean;
}

interface StudioCtx {
  section: StudioSection;
  setSection: (s: StudioSection) => void;
  draft: GenerationDraft;
  setDraft: (d: GenerationDraft) => void;
  notify: (message: string, error?: boolean) => void;
}

const Ctx = createContext<StudioCtx | null>(null);

export const useStudio = (): StudioCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudio must be used inside StudioShell');
  return ctx;
};

const NAV: Array<{ id: StudioSection; index: string; label: string; icon: string }> = [
  { id: 'dashboard', index: '01', label: 'Dashboard', icon: 'grid' },
  { id: 'analyzer', index: '02', label: 'Product Analyzer', icon: 'scan' },
  { id: 'templates', index: '03', label: 'Template Marketplace', icon: 'layers' },
  { id: 'generate', index: '04', label: 'Generation Studio', icon: 'wand' },
  { id: 'queue', index: '05', label: 'Queue Manager', icon: 'queue' },
  { id: 'history', index: '06', label: 'History', icon: 'clock' },
  { id: 'providers', index: '07', label: 'Providers', icon: 'server' },
  { id: 'brand', index: '08', label: 'Brand Studio', icon: 'palette' },
  { id: 'settings', index: '09', label: 'Settings', icon: 'gear' },
];

export const StudioShell: React.FC = () => {
  const [section, setSection] = useState<StudioSection>('dashboard');
  const [draft, setDraft] = useState<GenerationDraft>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeJobs, setActiveJobs] = useState<VideoJob[]>([]);

  const notify = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // Live job ticker — polls the jobs endpoint
  usePolling(
    async () => {
      const res = await videoApi.listJobs({ limit: 12 });
      setActiveJobs(res.items.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)));
    },
    JOB_POLL_INTERVAL_MS,
    true
  );

  const ctxValue = useMemo(() => ({ section, setSection, draft, setDraft, notify }), [section, draft, notify]);

  const activeNav = NAV.find((n) => n.id === section);

  return (
    <Ctx.Provider value={ctxValue}>
      <div className="studio-root flex">
        {/* ---------- Sidebar ---------- */}
        <aside
          className="w-[228px] flex-none flex flex-col border-r sticky top-0 h-screen"
          style={{ borderColor: 'var(--line)', background: 'rgba(13,16,23,0.72)' }}
        >
          <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--coral)', color: '#1a0d08' }}>
                <Icon name="film" size={16} />
              </div>
              <div>
                <div className="t-display font-bold text-[14px] leading-none">AURAPOST</div>
                <div className="kicker mt-1" style={{ fontSize: 9 }}>
                  VIDEO STUDIO
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group"
                  style={{
                    background: active ? 'var(--coral-soft)' : 'transparent',
                    borderLeft: `2px solid ${active ? 'var(--coral)' : 'transparent'}`,
                  }}
                >
                  <span className="t-mono text-[10px]" style={{ color: active ? 'var(--coral)' : 'var(--faint)' }}>
                    {item.index}
                  </span>
                  <span style={{ color: active ? 'var(--text)' : 'var(--muted)' }}>
                    <Icon name={item.icon} size={15} />
                  </span>
                  <span className="text-[13px] font-medium flex-1 transition-colors" style={{ color: active ? 'var(--text)' : 'var(--muted)' }}>
                    {item.label}
                  </span>
                  {item.id === 'queue' && activeJobs.length > 0 && (
                    <span className="chip chip-cyan" style={{ padding: '1px 7px' }}>
                      {activeJobs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center gap-2">
              <span className="dot dot-live" />
              <span className="t-mono text-[10.5px]" style={{ color: 'var(--muted)' }}>
                ENGINE ONLINE · {timecode(new Date())}
              </span>
            </div>
          </div>
        </aside>

        {/* ---------- Main column ---------- */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header
            className="sticky top-0 z-40 border-b flex items-center gap-5 px-7 h-[58px]"
            style={{ borderColor: 'var(--line)', background: 'rgba(12,15,22,0.86)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-center gap-2.5 flex-none">
              <span className="kicker">STUDIO</span>
              <span style={{ color: 'var(--faint)' }}>/</span>
              <span className="t-display font-semibold text-[14px]">{activeNav?.label}</span>
            </div>

            <div className="ticker flex-1 hidden md:block">
              {activeJobs.length > 0 ? (
                <div className="ticker-track">
                  {[...activeJobs, ...activeJobs].map((j, i) => (
                    <span key={`${j.id}-${i}`} className="t-mono text-[11px] inline-flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                      <span className="dot dot-live" />
                      {j.status.toUpperCase()} · {(j.model || 'video').split('/').pop()} · {j.progress ?? 0}%
                      <span style={{ color: 'var(--faint)' }}>·</span>
                      <span style={{ color: 'var(--cyan)' }}>{j.provider}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="t-mono text-[11px]" style={{ color: 'var(--faint)' }}>
                  IDLE — no active renders<span className="blink">_</span>
                </span>
              )}
            </div>

            <button onClick={() => setSection('generate')} className="btn btn-primary btn-sm flex-none">
              <Icon name="zap" size={13} /> New Render
            </button>
          </header>

          <main className="flex-1 px-7 py-7 max-w-[1460px] w-full mx-auto" key={section}>
            <ErrorBoundary section={activeNav?.label}>
              {section === 'dashboard' && <Dashboard />}
              {section === 'analyzer' && <ProductAnalyzer />}
              {section === 'templates' && <Marketplace />}
              {section === 'generate' && <GenerationStudio />}
              {section === 'queue' && <QueueManager />}
              {section === 'history' && <HistorySection />}
              {section === 'providers' && <ProvidersPanel />}
              {section === 'brand' && <BrandStudio />}
              {section === 'settings' && <SettingsPanel />}
            </ErrorBoundary>
          </main>
        </div>

        {/* ---------- Toasts ---------- */}
        <div className="fixed bottom-6 right-6 z-[80] space-y-2.5 w-[320px]">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.error ? 'toast-err' : ''}`}>
              <span style={{ color: t.error ? 'var(--coral)' : 'var(--mint)' }}>
                <Icon name={t.error ? 'x' : 'check'} size={14} />
              </span>
              <span className="flex-1">{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
};