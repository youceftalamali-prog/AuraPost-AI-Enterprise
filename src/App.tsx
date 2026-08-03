import React, { Suspense, useState, useEffect } from "react";
import { 
  Sparkles, 
  LogOut, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Globe, 
  Activity, 
  Layers, 
  Download, 
  Brain, 
  BarChart3, 
  CreditCard, 
  Cable, 
  Image as ImageIcon,
  Video,
  Share2,
  Calendar,
  Award,
  Settings
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import LoginCard from "./components/LoginCard.tsx";
const ProductsCatalog = React.lazy(() => import("./components/ProductsCatalog.tsx"));
const ProductImport = React.lazy(() => import("./components/ProductImport.tsx"));
const ProductAnalyzer = React.lazy(() => import("./components/ProductAnalyzer.tsx"));
const AnalyticsPanel = React.lazy(() => import("./components/AnalyticsPanel.tsx"));
const BillingManager = React.lazy(() => import("./components/BillingManager.tsx"));
const ShopifySync = React.lazy(() => import("./components/ShopifySync.tsx"));
const QueueCenter = React.lazy(() => import("./components/QueueCenter.tsx"));
const ImageStudio = React.lazy(() => import("./components/ImageStudio.tsx"));
const VideoStudioStudioShell = React.lazy(() =>
  import("./video-studio/components/VideoStudio/StudioShell.tsx").then((m) => ({ default: m.StudioShell }))
);
const PublishCenter = React.lazy(() => import("./components/PublishCenter.tsx"));
const ContentCalendar = React.lazy(() => import("./components/ContentCalendar.tsx"));
const SocialConnections = React.lazy(() => import("./components/SocialConnections.tsx"));
const BrandKit = React.lazy(() => import("./components/BrandKit.tsx"));
const AIProviders = React.lazy(() => import("./components/AIProviders.tsx"));
const SettingsModule = React.lazy(() => import("./components/SettingsModule.tsx"));
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { Workspace, User, WorkspaceMember, AuditLog, Session } from "./types.ts";

export default function App() {
  // Database States
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Auth / Session States
  const [session, setSession] = useState<Session | null>(null);
  const [testMode, setTestMode] = useState(false);
  
  // Real active sub-modules switcher state
  type TabName = 
    | "catalog" 
    | "import" 
    | "analyzer" 
    | "video" 
    | "content_studio" 
    | "image_studio" 
    | "publish" 
    | "calendar" 
    | "social_connections" 
    | "brand_kit" 
    | "analytics" 
    | "billing" 
    | "shopify" 
    | "queue"
    | "ai_providers"
    | "settings";
  const [activeTab, setActiveTab] = useState<TabName>("catalog");

  // Selection state bridging from Catalog to Analyzer/Studio
  const [selectedCatalogProductIdForStudio, setSelectedCatalogProductIdForStudio] = useState<string | undefined>(undefined);

  useEffect(() => {
    const savedAccess = localStorage.getItem("aurapost_access_token");
    const savedRefresh = localStorage.getItem("aurapost_refresh_token");
    if (savedAccess && savedRefresh) {
      fetch("/api/workspace", {
        headers: { Authorization: `Bearer ${savedAccess}` },
      }).then((r) => {
        if (r.ok) {
          return r.json();
        }
        throw new Error("Token expired");
      }).then((data) => {
        setSession({
          accessToken: savedAccess,
          refreshToken: savedRefresh,
          user: data.user || null,
        });
      }).catch(() => {
        localStorage.removeItem("aurapost_access_token");
        localStorage.removeItem("aurapost_refresh_token");
      });
    }

    fetch("/api/health")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && data.testMode) {
          setTestMode(true);
        }
      })
      .catch(err => console.error("Error reading health state:", err));
  }, []);

  const handleAddAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Math.floor(100 + Math.random() * 900)}`,
      workspaceId: session?.workspace?.id || "default-workspace",
      action,
      details,
      createdAt: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleLoginSuccess = (
    email: string,
    fullName: string,
    workspaceId: string,
    role: string,
    accessToken?: string,
    refreshToken?: string,
  ) => {
    localStorage.setItem("aurapost_access_token", accessToken || "");
    localStorage.setItem("aurapost_refresh_token", refreshToken || "");
    setSession({
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
      user: { id: "", email, full_name: fullName, role, active_workspace_id: workspaceId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });
  };

  const handleRegisterSuccess = (
    email: string,
    fullName: string,
    workspaceName: string,
    role: string,
    accessToken?: string,
    refreshToken?: string,
  ) => {
    localStorage.setItem("aurapost_access_token", accessToken || "");
    localStorage.setItem("aurapost_refresh_token", refreshToken || "");
    setSession({
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
      user: { id: "", email, full_name: fullName, role, active_workspace_id: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });
  };

  const handleLogout = async () => {
    if (session?.refreshToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      } catch { /* ignore errors on logout */ }
    }
    localStorage.removeItem("aurapost_access_token");
    localStorage.removeItem("aurapost_refresh_token");
    setSession(null);
  };

  // Nav Item configuration matching the 14 AuraPost modules
  const NAV_ITEMS = [
    { id: "catalog", label: "Catalog", icon: Layers, desc: "Products catalog" },
    { id: "import", label: "Product Import", icon: Download, desc: "Import products" },
    { id: "analyzer", label: "Product Analyzer", icon: Brain, desc: "Brand intelligence" },
    { id: "video", label: "Video Studio", icon: Video, desc: "AI promos" },
    { id: "content_studio", label: "AI Content Studio", icon: Sparkles, desc: "Copywriting" },
    { id: "image_studio", label: "Image Studio", icon: ImageIcon, desc: "Banners" },
    { id: "publish", label: "Publish Center", icon: Share2, desc: "Publish posts" },
    { id: "calendar", label: "Content Calendar", icon: Calendar, desc: "Scheduling" },
    { id: "social_connections", label: "Social Connections", icon: Cable, desc: "Connected platforms" },
    { id: "brand_kit", label: "Brand Kit", icon: Award, desc: "Tone guidelines" },
    { id: "analytics", label: "Analytics", icon: BarChart3, desc: "Key sales stats" },
    { id: "billing", label: "Billing", icon: CreditCard, desc: "Stripe subscriptions" },
    { id: "shopify", label: "Shopify Sync", icon: Cable, desc: "Sync stores" },
    { id: "ai_providers", label: "AI Infrastructure", icon: Cpu, desc: "AI Engines" },
    { id: "queue", label: "Queue Center", icon: Cpu, desc: "Telemetry" },
    { id: "settings", label: "Settings", icon: Settings, desc: "Workspace configuration" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b10] text-[#f1f3f9] font-sans antialiased flex flex-col selection:bg-indigo-500/30 selection:text-white">
      
      {/* Top Header Navigation */}
      <header className="border-b border-gray-800/60 bg-[#0c0d13]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-indigo-600 rounded-lg shadow-inner">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                AuraPost <span className="text-emerald-400">AI</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                Enterprise Workspace Portal
              </span>
            </div>
          </div>

          {/* User profile section */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-semibold text-white block">
                    {session?.user?.full_name || "Valued Customer"}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold block uppercase">
                    {session?.user?.role || "user"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-900/60 text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Logout Securely"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                SECURE PORTAL ONLINE
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
        
        {!session ? (
          /* Locked State - Display Premium Login & Flow overview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
            
            {/* Visual Intro Side */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                  ⚡ SECURE GATEWAY READY
                </span>
                <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white leading-tight tracking-tight">
                  Premium Enterprise <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-400 to-purple-500">
                    SaaS Multi-Tenancy
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-xl">
                  AuraPost AI implements industrial-grade authentication, stateless JWT session handovers, strict user isolation protocols, and granular role assignments (RBAC).
                </p>
              </div>

              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#12131a] border border-gray-800/40">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Zero-Trust Architecture
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Stateless cryptographically signed access tokens and rotated refresh session layers block unauthorized traversal.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#12131a] border border-gray-800/40">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    Strict Database Isolation
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Tenant resources are bound to distinct workspace identifiers, ensuring strict multi-tenant boundary compliance.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-xs text-gray-500 font-mono">
                * Seed standard credentials are preconfigured for instant exploration inside the Login Gateway dropdown.
              </div>
            </div>

            {/* Login Card Side */}
            <div className="lg:col-span-5 flex justify-center">
              <LoginCard
                workspaces={workspaces}
                onLoginSuccess={handleLoginSuccess}
                onRegisterSuccess={handleRegisterSuccess}
                onAddAuditLog={handleAddAuditLog}
              />
            </div>

          </div>
        ) : (
          /* Logged In Portal Panel */
          <div className="space-y-8">
            
            {/* Test Mode Banner */}
            {testMode && (
              <div className="bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-purple-950/40 border border-emerald-900/60 px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 text-center sm:text-left">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">TEST MODE IS ENABLED (PRE-PRODUCTION)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Credits validation has been bypassed, granting 999k+ trial balances on all engines.</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 transition-all text-black font-extrabold text-[10px] rounded-lg tracking-widest uppercase shadow-md select-none">
                  Unlimited Sandbox Build
                </span>
              </div>
            )}

            {/* Session Welcome Header Banner */}
            <div className="bg-gradient-to-r from-[#12131a] to-[#161722] rounded-2xl border border-gray-800/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl pointer-events-none" />
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                  ACTIVE AUTHENTICATED SESSION
                </span>
                <h2 className="text-2xl font-display font-bold text-white tracking-tight mt-1">
                  Welcome to <span className="text-emerald-400">{session.workspace?.name}</span> Portal
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-gray-400 mt-2 font-mono">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                    Slug: <span className="text-white">/{session.workspace?.slug}</span>
                  </span>
                  <span className="text-gray-700">•</span>
                  <span>
                    Workspace ID: <span className="text-indigo-400 font-semibold">{session.workspace?.id}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-navigation Menu bar linking all 14 Real AuraPost modules */}
            <div className="bg-[#0c0d12] p-1.5 rounded-xl border border-gray-850/60 flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as TabName);
                      if (item.id !== "image_studio" && item.id !== "content_studio") {
                        setSelectedCatalogProductIdForStudio(undefined);
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer font-display ${
                      active 
                        ? "bg-gray-850 text-white border border-gray-800" 
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-gray-500"}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Active Workspace Portal Screens */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <ErrorBoundary key={activeTab}>
                <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>}>
                {/* 1. Products Catalog */}
                {activeTab === "catalog" && (
                  <ProductsCatalog
                    workspaceId={session.workspace?.id || "default-workspace"}
                    initialSelectedProductId={selectedCatalogProductIdForStudio}
                    onSelectProductForAnalysis={(pId) => {
                      setSelectedCatalogProductIdForStudio(pId);
                      setActiveTab("analyzer");
                    }}
                    onSelectProductForStudio={(pId) => {
                      setSelectedCatalogProductIdForStudio(pId);
                      setActiveTab("content_studio");
                    }}
                    onAddAuditLog={handleAddAuditLog}
                  />
                )}

                {/* 2. Product Import */}
                {activeTab === "import" && (
                  <ProductImport
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    onImportSuccess={(productId) => {
                      setSelectedCatalogProductIdForStudio(productId);
                      setActiveTab("catalog");
                    }}
                  />
                )}

                {/* 3. Product Analyzer */}
                {activeTab === "analyzer" && (
                  <ProductAnalyzer
                    workspaceId={session.workspace?.id || "default-workspace"}
                    selectedProductIdFromCatalog={selectedCatalogProductIdForStudio}
                    onAddAuditLog={handleAddAuditLog}
                  />
                )}

                {/* 4. Video Studio */}
                {activeTab === "video" && <VideoStudioStudioShell />}

                {/* 5. AI Content Studio */}
                {activeTab === "content_studio" && (
                  <ImageStudio
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    selectedProductIdFromCatalog={selectedCatalogProductIdForStudio}
                    initialActiveTab="copy"
                    testMode={testMode}
                  />
                )}

                {/* 6. Image Studio */}
                {activeTab === "image_studio" && (
                  <ImageStudio
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    selectedProductIdFromCatalog={selectedCatalogProductIdForStudio}
                    initialActiveTab="graphics"
                    testMode={testMode}
                  />
                )}

                {/* 7. Publish Center */}
                {activeTab === "publish" && (
                  <PublishCenter
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    selectedProductIdFromCatalog={selectedCatalogProductIdForStudio}
                    testMode={testMode}
                  />
                )}

                {/* 8. Content Calendar */}
                {activeTab === "calendar" && (
                  <ContentCalendar
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    testMode={testMode}
                  />
                )}

                {/* 9. Social Connections */}
                {activeTab === "social_connections" && (
                  <SocialConnections
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    testMode={testMode}
                  />
                )}

                {/* 10. Brand Kit */}
                {activeTab === "brand_kit" && (
                  <BrandKit
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                    selectedProductIdFromCatalog={selectedCatalogProductIdForStudio}
                    testMode={testMode}
                  />
                )}

                {/* 11. Analytics Panel */}
                {activeTab === "analytics" && (
                  <AnalyticsPanel
                    workspaceId={session.workspace?.id || "default-workspace"}
                  />
                )}

                {/* 12. Billing & Subscriptions */}
                {activeTab === "billing" && (
                  <BillingManager
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                  />
                )}

                {/* 13. Shopify Sync */}
                {activeTab === "shopify" && (
                  <ShopifySync
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                  />
                )}

                {/* AI Infrastructure & Providers Settings */}
                {activeTab === "ai_providers" && (
                  <AIProviders
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                  />
                )}

                {/* 14. Queue Center */}
                {activeTab === "queue" && (
                  <QueueCenter
                    workspaceId={session.workspace?.id || "default-workspace"}
                    onAddAuditLog={handleAddAuditLog}
                  />
                )}

                {/* 15. Settings */}
                {activeTab === "settings" && <SettingsModule />}
                </Suspense>
                </ErrorBoundary>

                {/* Mini Live System Logs */}
                <div className="bg-[#12131a] rounded-2xl border border-gray-800/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Workspace Audit Stream
                    </h3>
                    <span className="text-[9px] font-mono bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-1.5 py-0.5 rounded font-bold">
                      Active Session Logs
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[190px] overflow-y-auto">
                    {logs.filter(l => l.workspaceId === session.workspace?.id).slice(0, 5).map((log) => (
                      <div key={log.id} className="border-b border-gray-800/40 pb-2.5 last:border-0 last:pb-0 font-mono text-[10px]">
                        <div className="flex justify-between text-gray-550 mb-0.5">
                          <span className="text-emerald-400 font-semibold">{log.action}</span>
                          <span>{log.createdAt ? log.createdAt.split("T")[1]?.substring(0, 8) : "00:00:00"}</span>
                        </div>
                        <p className="text-gray-300 font-sans leading-relaxed">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
            
          </div>
        )}

      </main>

      {/* Modern minimal footer */}
      <footer className="border-t border-gray-800/60 bg-[#0a0b10] py-6 mt-12 text-xs font-mono text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <span>AuraPost AI Multi-Tenant Portal</span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-600">v1.1.0 (Core Engine)</span>
            <span>•</span>
            <span className="text-emerald-500 font-bold">SSL Secured</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
