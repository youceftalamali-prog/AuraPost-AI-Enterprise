import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Languages,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';
import type { Session } from '../../types';
import {
  loadFeatureManifest,
  V1_FEATURE_FALLBACK,
  type FeatureManifest,
} from '../../core/api/featureManifest';
import { AgentHome } from './AgentHome';
import type {
  AgentLocale,
  AgentSourceMode,
  AgentTemplate,
  AgentToolId,
} from './types';

const ProductsCatalog = React.lazy(() => import('../../components/ProductsCatalog'));
const ProductImport = React.lazy(() => import('../../components/ProductImport'));
const ProductAnalyzer = React.lazy(() => import('../../components/ProductAnalyzer'));
const ImageStudio = React.lazy(() => import('../../components/ImageStudio'));
const VideoStudio = React.lazy(() =>
  import('../../video-studio/components/VideoStudio/StudioShell').then((module) => ({
    default: module.StudioShell,
  })),
);
const SettingsModule = React.lazy(() => import('../../components/SettingsModule'));

interface AgentFirstWorkspaceProps {
  session: Session;
  testMode: boolean;
  onLogout: () => void | Promise<void>;
  onAddAuditLog: (action: string, details: string) => void;
}

const toolLabels: Record<AgentToolId, Record<AgentLocale, string>> = {
  catalog: { ar: 'اختيار المنتج', fr: 'Choisir le produit', en: 'Choose product' },
  import: { ar: 'استيراد المنتج', fr: 'Importer le produit', en: 'Import product' },
  analyzer: { ar: 'تحليل المنتج والأسواق', fr: 'Analyser le produit', en: 'Analyze product' },
  video: { ar: 'إنشاء الفيديو', fr: 'Créer la vidéo', en: 'Create video' },
  content_studio: { ar: 'إنشاء المحتوى', fr: 'Créer le contenu', en: 'Create content' },
  image_studio: { ar: 'إنشاء الصورة', fr: "Créer l’image", en: 'Create image' },
  settings: { ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
};

function getInitialLocale(): AgentLocale {
  const saved = localStorage.getItem('aurapost_locale');
  if (saved === 'ar' || saved === 'fr' || saved === 'en') return saved;
  return 'ar';
}

export function AgentFirstWorkspace({
  session,
  testMode,
  onLogout,
  onAddAuditLog,
}: AgentFirstWorkspaceProps) {
  const [locale, setLocale] = useState<AgentLocale>(getInitialLocale);
  const [activeTool, setActiveTool] = useState<AgentToolId | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [manifest, setManifest] = useState<FeatureManifest>(V1_FEATURE_FALLBACK);
  const [manifestWarning, setManifestWarning] = useState(false);

  const workspaceId =
    session.workspace?.id || session.user.active_workspace_id || 'default-workspace';

  useEffect(() => {
    const controller = new AbortController();
    loadFeatureManifest(controller.signal)
      .then((nextManifest) => {
        setManifest(nextManifest);
        setManifestWarning(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setManifest(V1_FEATURE_FALLBACK);
        setManifestWarning(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem('aurapost_locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    return () => {
      document.documentElement.dir = 'ltr';
    };
  }, [locale]);

  const userName =
    session.user.full_name ||
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    session.user.email;

  const activeLabel = activeTool ? toolLabels[activeTool][locale] : '';

  const releasePolicySafe = useMemo(
    () =>
      !manifest.features.socialConnections &&
      !manifest.features.publishing &&
      !manifest.features.smartRepost &&
      !manifest.features.paidAds,
    [manifest],
  );

  const openTool = (tool: AgentToolId, reason: string) => {
    setActiveTool(tool);
    onAddAuditLog('agent.workflow_opened', reason);
  };

  const handleStart = (mode: AgentSourceMode, prompt: string) => {
    const promptContext = prompt ? ` Prompt: ${prompt}` : '';
    if (mode === 'url') {
      openTool('import', `Aura requested a product URL.${promptContext}`);
      return;
    }
    if (mode === 'image') {
      openTool('image_studio', `Aura requested an image-based workflow.${promptContext}`);
      return;
    }
    if (mode === 'saved_product') {
      openTool('catalog', `Aura requested a saved product.${promptContext}`);
      return;
    }
    if (mode === 'template') {
      openTool('video', `Aura opened template ${selectedTemplate?.id || 'custom'}.${promptContext}`);
      return;
    }
    openTool('content_studio', `Aura requested a description-based workflow.${promptContext}`);
  };

  const renderActiveTool = () => {
    if (!activeTool) return null;

    switch (activeTool) {
      case 'catalog':
        return (
          <ProductsCatalog
            workspaceId={workspaceId}
            initialSelectedProductId={selectedProductId}
            onSelectProductForAnalysis={(productId) => {
              setSelectedProductId(productId);
              openTool('analyzer', 'Aura moved the selected product to market analysis.');
            }}
            onSelectProductForStudio={(productId) => {
              setSelectedProductId(productId);
              openTool('content_studio', 'Aura moved the selected product to content creation.');
            }}
            onAddAuditLog={onAddAuditLog}
          />
        );
      case 'import':
        return (
          <ProductImport
            workspaceId={workspaceId}
            onAddAuditLog={onAddAuditLog}
            onImportSuccess={(productId) => {
              setSelectedProductId(productId);
              openTool('catalog', 'Aura imported the product and opened it for review.');
            }}
          />
        );
      case 'analyzer':
        return (
          <ProductAnalyzer
            workspaceId={workspaceId}
            selectedProductIdFromCatalog={selectedProductId}
            onAddAuditLog={onAddAuditLog}
          />
        );
      case 'image_studio':
        return (
          <ImageStudio
            workspaceId={workspaceId}
            onAddAuditLog={onAddAuditLog}
            selectedProductIdFromCatalog={selectedProductId}
            initialActiveTab="graphics"
            testMode={testMode}
          />
        );
      case 'content_studio':
        return (
          <ImageStudio
            workspaceId={workspaceId}
            onAddAuditLog={onAddAuditLog}
            selectedProductIdFromCatalog={selectedProductId}
            initialActiveTab="copy"
            testMode={testMode}
          />
        );
      case 'video':
        return <VideoStudio />;
      case 'settings':
        return <SettingsModule />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#090b12] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setActiveTool(null)} className="flex items-center gap-3 text-left">
            <span className="rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-2 shadow-lg shadow-indigo-950/40">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <span>
              <strong className="block text-sm text-white">AuraPost AI</strong>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Agent-first workspace</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400 md:flex">
              <ShieldCheck className={`h-4 w-4 ${releasePolicySafe ? 'text-emerald-400' : 'text-amber-400'}`} />
              {manifest.releaseVersion.toUpperCase()}
            </div>
            <label className="relative flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-slate-300">
              <Languages className="h-4 w-4 text-indigo-300" />
              <select
                aria-label="Interface language"
                value={locale}
                onChange={(event) => setLocale(event.target.value as AgentLocale)}
                className="appearance-none bg-transparent pr-4 outline-none"
              >
                <option className="bg-slate-950" value="ar">العربية</option>
                <option className="bg-slate-950" value="fr">Français</option>
                <option className="bg-slate-950" value="en">English</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-slate-500" />
            </label>
            <button type="button" onClick={() => setActiveTool('settings')} className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white" title="Settings">
              <Settings className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => void onLogout()} className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {testMode && (
          <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
            Test mode is active. Production configuration rejects this mode.
          </div>
        )}
        {manifestWarning && (
          <div className="mb-5 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-xs text-indigo-100">
            Feature policy could not be refreshed. AuraPost is using the safe V1 fallback with publishing disabled.
          </div>
        )}

        {!activeTool ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">{userName}</p>
                <p className="mt-1 text-sm text-slate-300">{session.user.email}</p>
              </div>
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400 sm:flex">
                <Bot className="h-4 w-4 text-emerald-300" />
                Aura controls the V1 workflow
              </div>
            </div>
            <AgentHome
              locale={locale}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              onStart={handleStart}
            />
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#11131d] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setActiveTool(null)} className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-300">Aura workflow</p>
                  <h1 className="font-semibold text-white">{activeLabel}</h1>
                </div>
              </div>
              {selectedTemplate && (
                <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                  {selectedTemplate.category} · {selectedTemplate.title}
                </span>
              )}
            </div>

            <ErrorBoundary key={activeTool}>
              <Suspense fallback={<div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-[#11131d] text-sm text-slate-400">Loading Aura workflow…</div>}>
                {renderActiveTool()}
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}
